import React, { useState } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import marketplaceAbi from '../abi/Marketplace.json';

export default function RegisterProductForm() {
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  // Estados do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0.1');
  const [commission, setCommission] = useState('15');
  const [tags, setTags] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const { data: hash, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFile(e.target.files[0]);
    }
  };

  // Função para fazer upload via backend proxy
  const uploadFileToCESS = async (file: File): Promise<{ success: boolean; fid: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${backendUrl}/api/upload-to-cess`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload falhou: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.fid) {
        throw new Error('FID não foi retornado pelo servidor');
      }

      return {
        success: true,
        fid: data.fid,
      };

    } catch (error: any) {
      console.error('Erro no upload via proxy CESS:', error);
      throw new Error(`Falha no upload: ${error.message}`);
    }
  };

  // Função para criar o arquivo JSON dos metadados
  const createMetadataFile = (imageFid: string): File => {
    const productMetadata = {
      name: name,
      description: description,
      price: price,
      commission: commission,
      tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      image_fid: imageFid,
      image_url: `https://deoss-sgp.cess.network/file/download/${imageFid}`,
      created_at: new Date().toISOString(),
      version: "1.0"
    };

    const metadataJson = JSON.stringify(productMetadata, null, 2);
    const metadataFileName = `metadata_${Date.now()}_${name.replace(/\s+/g, '_').toLowerCase()}.json`;
    
    return new File([metadataJson], metadataFileName, { type: 'application/json' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile) {
      setError('Por favor, selecione uma imagem para o produto.');
      return;
    }

    if (!name.trim() || !description.trim()) {
      setError('Nome e descrição são obrigatórios.');
      return;
    }

    setIsLoading(true);
    setError('');
    setStatus('');

    try {
      // ETAPA 1: Upload da imagem via backend proxy
      setStatus('1/3 - Fazendo upload da imagem...');
      
      const imageUploadResult = await uploadFileToCESS(imageFile);
      console.log('Imagem salva - FID:', imageUploadResult.fid);

      // ETAPA 2: Criar e fazer upload dos metadados JSON
      setStatus('2/3 - Preparando e enviando metadados...');
      
      const metadataFile = createMetadataFile(imageUploadResult.fid);
      const metadataUploadResult = await uploadFileToCESS(metadataFile);
      console.log('Metadados salvos - FID:', metadataUploadResult.fid);

      // ETAPA 3: Chamar o smart contract com o FID dos metadados
      setStatus('3/3 - Enviando transação para a blockchain...');
      
      writeContract({
        address: marketplaceAddress,
        abi: marketplaceAbi.abi,
        functionName: 'registerProduct',
        args: [
          parseEther(price || '0'),
          BigInt(commission || '0'),
          metadataUploadResult.fid, // FID dos metadados JSON no CESS
        ],
      });

    } catch (err: any) {
      console.error('Erro no processo:', err);
      setError(err.message || 'Ocorreu um erro durante o processo.');
      setIsLoading(false);
    }
  };
  
  React.useEffect(() => {
    if (isSuccess) {
      setStatus('Produto registrado com sucesso na blockchain!');
      setIsLoading(false);
      
      // Reset do formulário
      setName(''); 
      setDescription(''); 
      setPrice('0.1'); 
      setCommission('15'); 
      setTags(''); 
      setImageFile(null);
      
      // Reset do input file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }, [isSuccess]);

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="font-semibold text-lg text-white">Registrar Novo Produto</h3>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Nome do Produto</label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Digite o nome do produto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Descrição</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            required 
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Descreva o produto em detalhes"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Tags (separadas por vírgula)</label>
          <input 
            type="text" 
            value={tags} 
            onChange={e => setTags(e.target.value)} 
            placeholder="eletrônicos, casa, jardim"
            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {tags && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.split(',').map((tag, index) => tag.trim() && (
                <span key={index} className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Preço (ETH)</label>
            <input 
              type="number" 
              step="0.001"
              min="0"
              value={price} 
              onChange={e => setPrice(e.target.value)} 
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Comissão (%)</label>
            <input 
              type="number" 
              min="0"
              max="100"
              value={commission} 
              onChange={e => setCommission(e.target.value)} 
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Imagem do Produto</label>
          <input 
            type="file" 
            onChange={handleImageChange} 
            accept="image/*" 
            required 
            className="mt-1 block w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {imageFile && (
            <div className="mt-2 p-2 bg-gray-800 rounded">
              <p className="text-sm text-gray-400">
                <strong>Arquivo:</strong> {imageFile.name}
              </p>
              <p className="text-sm text-gray-400">
                <strong>Tamanho:</strong> {(imageFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-sm text-gray-400">
                <strong>Tipo:</strong> {imageFile.type}
              </p>
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full py-3 px-4 border rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400/50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {status || 'Processando...'}
            </div>
          ) : (
            'Registrar Produto'
          )}
        </button>

        {/* Mensagens de Feedback */}
        {isSuccess && (
          <div className="p-3 bg-green-900/50 border border-green-600 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-green-400 text-sm font-medium">{status}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-600 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && status && (
          <div className="p-3 bg-blue-900/50 border border-blue-600 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              </div>
              <div className="ml-3">
                <p className="text-blue-400 text-sm font-medium">{status}</p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

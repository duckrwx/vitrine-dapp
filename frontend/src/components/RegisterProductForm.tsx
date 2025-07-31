import React, { useState } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import marketplaceAbi from '../abi/Marketplace.json';

export default function RegisterProductForm() {
  const marketplaceAddress = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '') as `0x${string}`;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  // Estados do formulário completo
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Por favor, selecione uma imagem para o produto.');
      return;
    }
    setIsLoading(true);
    setError('');
    setStatus('');

    try {
      // ETAPA 1: Upload da imagem para o nosso backend
      setStatus('1/3 - A fazer upload da imagem...');
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile);
      const imageResponse = await fetch(`${backendUrl}/api/upload/image`, {
        method: 'POST',
        body: imageFormData,
      });
      if (!imageResponse.ok) throw new Error('Falha no upload da imagem.');
      const imageData = await imageResponse.json();

      // ETAPA 2: Preparar e fazer upload dos metadados para o backend
      setStatus('2/3 - A preparar metadados...');
      const metadataPayload = {
        name, description, price, commission,
        tags: tags.split(',').map(t => t.trim()),
        image_url: imageData.image_url,
        image_hash: imageData.image_hash,
      };
      const metadataResponse = await fetch(`${backendUrl}/api/products/prepare_metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadataPayload),
      });
      if (!metadataResponse.ok) throw new Error('Falha na preparação dos metadados.');
      const metadataData = await metadataResponse.json();
      const metadataFid = metadataData.metadata_fid;

      // ETAPA 3: Chamar o smart contract com os 3 argumentos corretos
      setStatus('3/3 - A enviar transação para a blockchain...');
      writeContract({
        address: marketplaceAddress,
        abi: marketplaceAbi.abi,
        functionName: 'registerProduct',
        args: [
          parseEther(price || '0'),
          BigInt(commission || '0'),
          metadataFid, // O terceiro argumento crucial
        ],
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro.');
      setIsLoading(false);
    }
  };
  
  React.useEffect(() => {
    if (isSuccess) {
      setStatus('Produto registado com sucesso!');
      setIsLoading(false);
      setName(''); setDescription(''); setPrice('0.1'); setCommission('15'); setTags(''); setImageFile(null);
    }
  }, [isSuccess]);

  // Adicione um estilo básico e os novos campos ao seu JSX
  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="font-semibold text-lg text-white">Registar Novo Produto</h3>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {/* Adicione os novos campos aqui */}
        <div><label className="block text-sm font-medium text-gray-300">Nome do Produto</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div>
        <div><label className="block text-sm font-medium text-gray-300">Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div>
        <div><label className="block text-sm font-medium text-gray-300">Tags (separadas por vírgula)</label><input type="text" value={tags} onChange={e => setTags(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-300">Preço (ETH)</label><input type="text" value={price} onChange={e => setPrice(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div>
          <div><label className="block text-sm font-medium text-gray-300">Comissão (%)</label><input type="number" value={commission} onChange={e => setCommission(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-md"/></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-300">Imagem do Produto</label><input type="file" onChange={handleImageChange} accept="image/*" required className="mt-1 block w-full text-gray-300"/></div>
        
        <button type="submit" disabled={isLoading} className="w-full py-2 px-4 border rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400/50">
          {isLoading ? status || 'A registar...' : 'Registar Produto'}
        </button>
        {isSuccess && <p className="text-green-400 text-center text-sm">{status}</p>}
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
      </form>
    </div>
  );
}

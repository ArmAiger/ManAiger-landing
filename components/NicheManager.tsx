import { useState } from 'react';
import { api } from '@/src/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { toast } from 'react-hot-toast';

interface Niche {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface NicheItemProps {
  niche: Niche;
  onUpdate: (oldNicheId: string, updatedNiche: Niche) => void;
  onDelete: (nicheId: string) => void;
}

function NicheItem({ niche, onUpdate, onDelete }: NicheItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(niche.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleEdit = async () => {
    if (!editName.trim()) return;
    
    setIsUpdating(true);
    const response = await api.updateUserNiche(niche.id, editName.trim());
    
    if (response.data) {
      // The API returns a new niche object, so we need to handle this properly
      onUpdate(niche.id, response.data);
      setIsEditing(false);
      toast.success('Niche updated successfully!');
    } else if (response.error) {
      toast.error(response.error);
    }
    
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const response = await api.removeUserNiche(niche.id);
    if (!response.error) {
      onDelete(niche.id);
      toast.success('Niche removed successfully!');
    } else {
      toast.error(response.error || 'Failed to remove niche');
    }
    
    setIsDeleting(false);
    setShowDeleteModal(false);
  };

  const handleCancelEdit = () => {
    setEditName(niche.name);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Input
          value={editName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
          className="flex-1 h-8"
          placeholder="Niche name"
          autoFocus
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') handleEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
        />
        <Button
          size="sm"
          onClick={handleEdit}
          disabled={isUpdating || !editName.trim() || editName.trim() === niche.name}
          className="h-8"
        >
          {isUpdating ? 'Saving...' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCancelEdit}
          disabled={isUpdating}
          className="h-8"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
        <span className="text-gray-900 font-medium capitalize">{niche.name}</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsEditing(true)}
            className="h-8 px-3"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowDeleteModal(true)}
            className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            Remove
          </Button>
        </div>
      </div>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Remove Niche</h3>
          <p className="text-gray-700 mb-6">
            Are you sure you want to remove the niche &quot;<strong>{niche.name}</strong>&quot; from your list? 
            This won&apos;t delete the niche entirely, just remove it from your account.
          </p>
          <div className="flex justify-end gap-4">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              {isDeleting ? 'Removing...' : 'Remove Niche'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

interface NicheManagerProps {
  niches: Niche[];
  onNichesChange: (niches: Niche[]) => void;
}

export default function NicheManager({ niches, onNichesChange }: NicheManagerProps) {
  const [nicheName, setNicheName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNiche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicheName.trim()) return;

    setIsAdding(true);
    const response = await api.addNiche(nicheName.trim());
    
    if (response.data) {
      onNichesChange([...niches, response.data]);
      setNicheName('');
      toast.success('Niche added successfully!');
    } else if (response.error) {
      toast.error(response.error);
    }
    
    setIsAdding(false);
  };

  const handleUpdateNiche = (oldNicheId: string, updatedNiche: Niche) => {
    // Replace the old niche with the new one using the old niche ID
    const updatedNiches = niches.map(niche => 
      niche.id === oldNicheId ? updatedNiche : niche
    );
    onNichesChange(updatedNiches);
  };

  const handleDeleteNiche = (nicheId: string) => {
    const updatedNiches = niches.filter(niche => niche.id !== nicheId);
    onNichesChange(updatedNiches);
  };

  return (
    <div>
      <form onSubmit={handleAddNiche} className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            value={nicheName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNicheName(e.target.value)}
            placeholder="Enter niche name"
            className="w-full"
          />
        </div>
        <Button
          type="submit"
          disabled={isAdding || !nicheName.trim()}
        >
          {isAdding ? 'Adding...' : 'Add Niche'}
        </Button>
      </form>

      {niches.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-3">
            You have {niches.length} niche{niches.length !== 1 ? 's' : ''}. Click edit to modify or remove to delete.
          </p>
          {niches.map((niche) => (
            <NicheItem
              key={niche.id}
              niche={niche}
              onUpdate={handleUpdateNiche}
              onDelete={handleDeleteNiche}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 text-gray-500">
          <p className="mb-2">No niches added yet.</p>
          <p className="text-sm">Add your first niche to start finding brand matches.</p>
        </div>
      )}
    </div>
  );
}

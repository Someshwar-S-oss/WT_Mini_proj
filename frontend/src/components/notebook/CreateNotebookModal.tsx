import { useState } from 'react';
import { useCreateNotebook } from '../../hooks/useNotebooks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface CreateNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateNotebookModal({ isOpen, onClose }: CreateNotebookModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    courseName: '',
    courseCode: '',
    isPublic: false,
  });
  const [error, setError] = useState('');

  const createNotebook = useCreateNotebook();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Notebook name is required');
      return;
    }

    try {
      await createNotebook.mutateAsync(formData);
      onClose();
      setFormData({
        name: '',
        description: '',
        courseName: '',
        courseCode: '',
        isPublic: false,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create notebook');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Notebook</DialogTitle>
          <DialogDescription>
            Create a new notebook to organize your notes and files.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Notebook Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Data Structures Notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of this notebook"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                name="courseName"
                type="text"
                value={formData.courseName}
                onChange={handleChange}
                placeholder="e.g., Computer Science"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                name="courseCode"
                type="text"
                value={formData.courseCode}
                onChange={handleChange}
                placeholder="e.g., CS101"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="isPublic"
              name="isPublic"
              type="checkbox"
              checked={formData.isPublic}
              onChange={handleChange}
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
            <Label htmlFor="isPublic" className="cursor-pointer font-normal">
              Make this notebook public
            </Label>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createNotebook.isPending}>
              {createNotebook.isPending ? 'Creating...' : 'Create Notebook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

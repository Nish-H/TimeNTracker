import React, { useState, useEffect } from 'react';
import { FaTimes, FaTags, FaSave, FaPalette } from 'react-icons/fa';
import { Category } from '@/types';
import { categoriesApi } from '@/services/api';
import toast from 'react-hot-toast';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSave: (category: Category) => void;
}

const predefinedColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#A855F7', // Violet
];

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, category, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        color: category.color,
      });
    } else {
      setFormData({
        name: '',
        color: '#3B82F6',
      });
    }
    setErrors({});
    setShowColorPicker(false);
  }, [category, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Category name must be less than 50 characters';
    }

    if (!formData.color || !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      newErrors.color = 'Please select a valid color';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let savedCategory: Category;
      
      // Prepare sanitized data
      const sanitizedData = {
        name: formData.name.trim(),
        color: formData.color.toUpperCase()
      };
      
      if (category) {
        // Edit existing category
        const response = await categoriesApi.update(category.id, sanitizedData);
        if (response.data?.category) {
          savedCategory = response.data.category;
          toast.success('Category updated successfully');
        } else {
          throw new Error('Invalid response from server');
        }
      } else {
        // Create new category
        const response = await categoriesApi.create(sanitizedData);
        if (response.data?.category) {
          savedCategory = response.data.category;
          toast.success('Category created successfully');
        } else {
          throw new Error('Invalid response from server');
        }
      }

      onSave(savedCategory);
      onClose();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to save category';
      
      if (error.response?.status === 409) {
        errorMessage = 'A category with this name already exists';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid category data';
      } else if (error.response?.status === 401) {
        errorMessage = 'You are not authorized to perform this action';
        // Redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
    setShowColorPicker(false);
    
    // Clear color error
    if (errors.color) {
      setErrors(prev => ({
        ...prev,
        color: ''
      }));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaTags className="text-primary-600" />
            <h2 className="text-xl font-semibold text-black font-bold">
              {category ? 'Edit Category' : 'Add New Category'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:text-gray-800 transition-colors"
            disabled={loading}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="form-label">
              Category Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter category name"
              disabled={loading}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Color Selection */}
          <div>
            <label className="form-label">
              Color *
            </label>
            <div className="space-y-3">
              {/* Selected Color Display */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: formData.color }}
                ></div>
                <span className="text-sm font-medium text-black font-bold">
                  {formData.color.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="btn btn-sm btn-secondary flex items-center gap-2"
                  disabled={loading}
                >
                  <FaPalette />
                  Change Color
                </button>
              </div>

              {/* Color Picker */}
              {showColorPicker && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      ></button>
                    ))}
                  </div>

                  {/* Custom Color Input */}
                  <div>
                    <label htmlFor="customColor" className="block text-sm font-medium text-black font-bold mb-1">
                      Custom Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="customColor"
                        value={formData.color}
                        onChange={(e) => handleColorSelect(e.target.value)}
                        className="w-8 h-8 rounded border border-gray-300"
                        disabled={loading}
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                            setFormData(prev => ({ ...prev, color: value }));
                          }
                        }}
                        className="form-input text-sm"
                        placeholder="#000000"
                        maxLength={7}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}

              {errors.color && (
                <p className="text-sm text-red-600">{errors.color}</p>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <label className="block text-sm font-medium text-black font-bold mb-2">
              Preview
            </label>
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: formData.color }}
              ></div>
              <span className="font-medium">
                {formData.name || 'Category Name'}
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FaSave />
                  {category ? 'Update Category' : 'Create Category'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
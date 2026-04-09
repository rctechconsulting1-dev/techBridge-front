import { useState, useCallback } from 'react';
import { FormData, FormErrors } from '@/types/page';

const initialFormData: FormData = {
  seoTitle: "",
  seoKeywords: "",
  seoDescription: "",
  title: "",
  slug: "",
};

const initialErrors: FormErrors = {
  seoTitle: "",
  seoKeywords: "",
  seoDescription: "",
  title: "",
  slug: "",
};

type FormFieldValue = string | number | boolean | null;

export const useFormValidation = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>(initialErrors);

  const validateField = useCallback((name: keyof FormData, value: string): boolean => {
    let error = "";

    switch (name) {
      case "seoTitle":
        if (!value.trim()) error = "SEO Title is required";
        else if (value.length < 10) error = "SEO Title must be at least 10 characters";
        else if (value.length > 80) error = "SEO Title must be less than 60 characters";
        break;
      case "seoKeywords":
        if (!value.trim()) error = "SEO Keywords are required";
        else if (value.split(",").length < 3) error = "At least 3 keywords required (comma separated)";
        break;
      case "seoDescription":
        if (!value.trim()) error = "SEO Description is required";
        else if (value.length < 110) error = "SEO Description must be at least 110 characters";
        else if (value.length > 180) error = "SEO Description must be less than 180 characters";
        break;
      case "title":
        if (!value.trim()) error = "Title is required";
        else if (value.length < 70) error = "Title must be at least 70 characters";
        break;
      case "slug":
        if (!value.trim()) error = "Slug is required";
        else if (!/^[a-z0-9-]+$/.test(value)) error = "Slug must contain only lowercase letters, numbers, and hyphens";
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return error === "";
  }, []);

  const handleInputChange = useCallback((name: string, value: FormFieldValue) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (typeof value === 'string') {
      validateField(name as keyof FormData, value);
    }
  }, [validateField]);

  const validateAllFields = useCallback((): boolean => {
    const keys = Object.keys(formData) as Array<keyof FormData>;
    return keys.every((key) => validateField(key, formData[key] ?? ""));
  }, [formData, validateField]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors(initialErrors);
  }, []);

  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  return {
    formData,
    errors,
    handleInputChange,
    validateAllFields,
    resetForm,
    updateFormData,
  };
};

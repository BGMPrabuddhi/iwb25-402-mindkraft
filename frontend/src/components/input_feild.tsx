"use client";
import React from "react";

type InputFieldProps = {
  label: string;
  type?: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  error?: string;
  textarea?: boolean; // for description/news
};

export default function InputField({
  label,
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  required = false,
  error,
  textarea = false,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={name} className="font-medium text-gray-700">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      ) : (
        <input
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Image from "next/image";
import React, { useState } from "react";
import type { Post } from "@/types/google-business";

export function CreatePostModal({ clientName, onClose, onCreatePost }: {
    clientName: string;
    onClose: () => void;
    onCreatePost: (posts: Post[]) => void;
}) {
    const [posts, setPosts] = useState<Post[]>([{
        id: 1,
        topicType: 'STANDARD',
        languageCode: 'en-US',
        summary: '',
        callToAction: { actionType: 'LEARN_MORE', url: '' },
        media: [],
        event: null,
        offer: null,
        product: null,
        scheduleTime: '',
        alertType: 'NOT_SPECIFIED'
    }]);

    const topicTypes = [
        { value: 'STANDARD', label: 'Standard' },
        { value: 'EVENT', label: 'Event' },
        { value: 'OFFER', label: 'Offer' },
        { value: 'PRODUCT', label: 'Product' }
    ];

    const actionTypes = [
        { value: 'LEARN_MORE', label: 'Learn More' },
        { value: 'BOOK', label: 'Book' },
        { value: 'ORDER_ONLINE', label: 'Order Online' },
        { value: 'BUY', label: 'Buy' },
        { value: 'SIGN_UP', label: 'Sign Up' },
        { value: 'CALL', label: 'Call' }
    ];

    const alertTypes = [
        { value: 'NOT_SPECIFIED', label: 'Not Specified' },
        { value: 'COVID_19', label: 'COVID-19' }
    ];

    const addPost = () => {
        setPosts([...posts, {
            id: Date.now(),
            topicType: 'STANDARD',
            languageCode: 'en-US',
            summary: '',
            callToAction: { actionType: 'LEARN_MORE', url: '' },
            media: [],
            event: null,
            offer: null,
            product: null,
            scheduleTime: '',
            alertType: 'NOT_SPECIFIED'
        }]);
    };

    const updatePost = (id: number, field: string, value: string) => {
        setPosts(posts.map(post => post.id === id ? { ...post, [field]: value } : post
        ));
    };

    const updateCallToAction = (id: number, field: string, value: string) => {
        setPosts(posts.map(post => post.id === id ? {
            ...post,
            callToAction: { ...post.callToAction, [field]: value }
        } : post
        ));
    };

    const removePost = (id: number) => {
        if (posts.length > 1) {
            setPosts(posts.filter(post => post.id !== id));
        }
    };

    const handleSubmit = () => {
        onCreatePost(posts);
    };

    const handleImageUpload = (postId: number, files: FileList | null) => {
        if (!files) return;

        const newMedia = Array.from(files).map(file => ({
            id: Date.now() + Math.random(),
            mediaFormat: 'PHOTO',
            sourceUrl: URL.createObjectURL(file),
            name: file.name,
            file: file
        }));

        setPosts(posts.map(post => post.id === postId ? {
            ...post,
            media: [...post.media, ...newMedia].slice(0, 10)
        } : post
        ));
    };

    const removeMedia = (postId: number, mediaId: any) => {
        setPosts(posts.map(post => post.id === postId ? {
            ...post,
            media: post.media.filter(m => m.id !== mediaId)
        } : post
        ));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Create Google My Business Posts for {clientName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {posts.map((post, index) => (
                        <div key={post.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Post {index + 1}
                                </h4>
                                {posts.length > 1 && (
                                    <button
                                        onClick={() => removePost(post.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Topic Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Topic Type
                                    </label>
                                    <select
                                        value={post.topicType}
                                        onChange={(e) => updatePost(post.id, 'topicType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {topicTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Language Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Language Code
                                    </label>
                                    <input
                                        type="text"
                                        value={post.languageCode}
                                        onChange={(e) => updatePost(post.id, 'languageCode', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="en-US" />
                                </div>

                                {/* Schedule Time */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Schedule Time (Optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={post.scheduleTime}
                                        onChange={(e) => updatePost(post.id, 'scheduleTime', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>

                                {/* Alert Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Alert Type
                                    </label>
                                    <select
                                        value={post.alertType}
                                        onChange={(e) => updatePost(post.id, 'alertType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {alertTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Summary (1500 characters max)
                                </label>
                                <textarea
                                    value={post.summary}
                                    onChange={(e) => updatePost(post.id, 'summary', e.target.value)}
                                    maxLength={1500}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Enter your post content..." />
                                <p className="text-xs text-gray-500 mt-1">
                                    {post.summary.length}/1500 characters
                                </p>
                            </div>

                            {/* Call to Action */}
                            <div className="mt-4">
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Call to Action
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            Action Type
                                        </label>
                                        <select
                                            value={post.callToAction.actionType}
                                            onChange={(e) => updateCallToAction(post.id, 'actionType', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                        >
                                            {actionTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            URL
                                        </label>
                                        <input
                                            type="url"
                                            value={post.callToAction.url}
                                            onChange={(e) => updateCallToAction(post.id, 'url', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            placeholder="https://example.com" />
                                    </div>
                                </div>
                            </div>

                            {/* Media Upload */}
                            <div className="mt-4">
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Images (Optional - Up to 10 images)
                                </h5>

                                {/* Current Images */}
                                {post.media.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        {post.media.map((media) => (
                                            <div key={media.id} className="relative group">
                                                <Image
                                                    src={media.sourceUrl}
                                                    alt={media.name}
                                                    width={80}
                                                    height={80}
                                                    className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                                                <button
                                                    onClick={() => removeMedia(post.id, media.id)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ×
                                                </button>
                                                <p className="text-xs text-gray-500 mt-1 truncate">{media.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload Button */}
                                {post.media.length < 10 && (
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleImageUpload(post.id, e.target.files)}
                                            className="hidden"
                                            id={`image-upload-${post.id}`} />
                                        <label
                                            htmlFor={`image-upload-${post.id}`}
                                            className="cursor-pointer flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                                        >
                                            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="text-sm">Click to upload images</span>
                                            <span className="text-xs text-gray-400 mt-1">
                                                PNG, JPG up to 10MB each ({10 - post.media.length} remaining)
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Event Fields (only show if topicType is EVENT) */}
                            {post.topicType === 'EVENT' && (
                                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                                        Event Details
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Event Title"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        <input
                                            type="datetime-local"
                                            placeholder="Start Time"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        <input
                                            type="datetime-local"
                                            placeholder="End Time"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                </div>
                            )}

                            {/* Offer Fields (only show if topicType is OFFER) */}
                            {post.topicType === 'OFFER' && (
                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <h5 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
                                        Offer Details
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Coupon Code"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        <input
                                            type="text"
                                            placeholder="Redemption URL"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                </div>
                            )}

                            {/* Product Fields (only show if topicType is PRODUCT) */}
                            {post.topicType === 'PRODUCT' && (
                                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <h5 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-3">
                                        Product Details
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Product Name"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        <input
                                            type="text"
                                            placeholder="Product Category"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Post Button */}
                    <button
                        onClick={addPost}
                        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                    >
                        + Add Another Post
                    </button>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Creating {posts.length} post{posts.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Create Posts
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

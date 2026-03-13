"use client";
import React, { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useBusinessByWebsiteId } from "../../hooks/useBusinessByWebsiteId";
import { mutateUpdate } from "../../hooks/useMutateUpdate";
import { useSidebar } from "../../context/SidebarContext";
import { mutate } from "swr";
import { getApiBaseUrl } from "@/lib/api";
import { toast } from "react-toastify";


export default function UserBusinessCard() {
  // Context
  const { selectedClient, setSelectedClient } = useSidebar();
  // SWR
  const { business } = useBusinessByWebsiteId(selectedClient?.website_id ?? null);
  // Modal state
  const { isOpen, openModal, closeModal } = useModal();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    rating: 0,
    reviewCount: 0,
    x_url: "",
    instagram: "",
    facebook: "",
  });

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.business_name || "",
        address: business.address || "",
        rating: business.rating || 0,
        reviewCount: business.review_count || 0,
        x_url: business.x_url || "",
        instagram: business.instagram || "",
        facebook: business.facebook || "",
      });
    } else {
      setFormData({
        name: "",
        address: "",
        rating: 0,
        reviewCount: 0,
        x_url: "",
        instagram: "",
        facebook: "",
      });
    }
  }, [business]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSave = async () => {
    let websiteId = selectedClient?.website_id ?? null;

    // Step 1: If no website yet, create one and link it to the user
    if (!websiteId) {
      const websiteResult = await mutateUpdate({
        path: "/website",
        method: "POST",
        payload: { name: formData.name },
        additionalHeaders: { Prefer: "return=representation" },
      });
      if (websiteResult.error) {
        toast.error("Failed to create website. Please try again.");
        return;
      }
      const websiteResponse = websiteResult.response as { id: number } | { id: number }[];
      websiteId = Array.isArray(websiteResponse) ? websiteResponse[0]?.id : websiteResponse?.id;
      if (!websiteId) {
        toast.error("Website creation did not return an id.");
        return;
      }

      // Link website to user
      await mutateUpdate({
        path: `/user?id=eq.${selectedClient?.id}`,
        method: "PATCH",
        payload: { website_id: websiteId },
      });

      // Update context so future saves know the website_id
      setSelectedClient({ ...selectedClient, website_id: websiteId });
    }

    // Step 2: Build the business listing payload
    const listingPayload = {
      business_name: formData.name,
      address: formData.address,
      rating: formData.rating,
      review_count: formData.reviewCount,
      x_url: formData.x_url,
      instagram: formData.instagram,
      facebook: formData.facebook,
      website_id: websiteId,
    };

    const mutateKey = `${getApiBaseUrl()}/business-listings?website_id=${websiteId}`;

    if (business?.id) {
      // Update existing listing
      const result = await mutateUpdate({
        path: `/business-listings/${business.id}`,
        method: "PATCH",
        mutateKey,
        payload: listingPayload,
      });
      if (result.error) {
        toast.error("Failed to update business information.");
        return;
      }
    } else {
      // Create first listing
      const result = await mutateUpdate({
        path: "/business_listing",
        method: "POST",
        mutateKey,
        payload: listingPayload,
      });
      if (result.error) {
        toast.error("Failed to save business information.");
        return;
      }
    }

    await mutate(`${getApiBaseUrl()}/users/${selectedClient?.id}`);
    toast.success("Business information saved successfully.");
    closeModal();
  };
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Business Information
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Name
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.name}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Address
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.address}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Rating
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.rating}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Number of Reviews
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.reviewCount}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Website
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  TODO
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  X
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.x_url}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Instagram
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.instagram}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Facebook
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.facebook}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Edit
          </button>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Address
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="px-2 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div>
                  <Label>Business Name</Label>
                  <Input type="text" name="name" value={formData.name ?? ""} onChange={handleChange} />
                </div>

                <div>
                  <Label>Address</Label>
                  <Input type="text" name="address" value={formData.address ?? ""} onChange={handleChange} />
                </div>

                <div>
                  <Label>Rating</Label>
                  <Input type="text" name="rating" value={formData.rating ?? ""} onChange={handleChange} />
                </div>

                <div>
                  <Label>Amount of Reviews</Label>
                  <Input type="text" name="reviewCount" value={formData.reviewCount ?? ""} onChange={handleChange} />
                </div>
                <div>
                  <Label>X</Label>
                  <Input type="text" name="x_url" value={formData.x_url ?? ""} onChange={handleChange} />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input type="text" name="instagram" value={formData.instagram ?? ""} onChange={handleChange} />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input type="text" name="facebook" value={formData.facebook ?? ""} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

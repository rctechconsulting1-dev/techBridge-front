"use client";

import React, { useState } from "react";
import UserInfoCard from "./UserInfoCard";
import UserMetaCard from "./UserMetaCard";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useSidebar } from "../../context/SidebarContext";
import UserBusinessCard from "./UserBusinessCard";
import { Modal } from "../ui/modal";
import { apiClient } from "@/lib/api-client";

const ProfileClient: React.FC = () => {
    // Context
    const { selectedClient } = useSidebar();

    // State to manage new user creation form visibility
    const [isNewUser, setIsNewUser] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState<string | null>(null);

    //SWR
    // 1. Insert Website get last id
    // 2. Update User table 
    // 3. Insert Business Listing Table
    // 4. TODO: Create New User it only handles Update User
    const handleSave = async () => {
        try {
            setError(null);
            await apiClient.signUp(formData.email, formData.password, formData.name);
            const firstName = formData.name.split(" ")[0] || undefined;

            // Send welcome email + password-reset so the user can set their own password
            await Promise.allSettled([
                apiClient.sendWelcomeEmail(formData.email, firstName),
                apiClient.sendResetPasswordEmail(formData.email, firstName),
            ]);

            setFormData({ name: "", email: "", password: "" });
            setIsNewUser(false);
        } catch (err) {
            const apiError = err as { message?: string };
            setError(apiError?.message || "Failed to create user");
            console.error("User creation error:", err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Handle input change logic here
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };


    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5 flex flex-row items-center justify-between lg:mb-7">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Profile
                </h3>
                <Button variant="outline" onClick={() => setIsNewUser(!isNewUser)}>
                    Create User
                </Button>
            </div>
            <Modal isOpen={isNewUser} onClose={() => setIsNewUser(false)} className="max-w-[700px] m-4">
                <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Add New User
                        </h4>
                    </div>
                    <form className="flex flex-col">
                        {error && (
                            <div className="px-2 mb-4 p-3 text-sm text-[#C41E3A] bg-[#C41E3A]/5 border border-[#C41E3A]/20 rounded-lg dark:bg-[#C41E3A]/10 dark:border-[#C41E3A]/30">
                                {error}
                            </div>
                        )}
                        <div className="px-2 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div>
                                    <Label>Name</Label>
                                    <Input type="text" name="name" value={formData.name ?? ""} onChange={handleChange} />
                                </div>

                                <div>
                                    <Label>Email</Label>
                                    <Input type="text" name="email" value={formData.email ?? ""} onChange={handleChange} />
                                </div>

                                <div>
                                    <Label>Password</Label>
                                    <Input type="password" name="password" value={formData.password ?? ""} onChange={handleChange} autoComplete="new-password" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" onClick={() => setIsNewUser(false)}>
                                Close
                            </Button>
                            <Button size="sm" onClick={handleSave}>
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
            <div className="space-y-6">
                <UserMetaCard />
                <UserInfoCard user={selectedClient} />
                <UserBusinessCard />
            </div>
        </div>
    );
};

export default ProfileClient;

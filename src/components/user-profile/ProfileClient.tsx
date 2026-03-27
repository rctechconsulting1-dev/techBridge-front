"use client";

import React from "react";
import UserInfoCard from "./UserInfoCard";
import UserMetaCard from "./UserMetaCard";
import { useSidebar } from "../../context/SidebarContext";
import UserBusinessCard from "./UserBusinessCard";

const ProfileClient: React.FC = () => {
  const { selectedClient } = useSidebar();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 lg:mb-7">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Profile
        </h3>
      </div>
      <div className="space-y-6">
        <UserMetaCard />
        <UserInfoCard user={selectedClient} />
        <UserBusinessCard />
      </div>
    </div>
  );
};

export default ProfileClient;

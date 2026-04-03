"use client";

import TenantsPage from "../(admin)/(others-pages)/tenants/page";
import AdminLayout from "../(admin)/layout";

export default function Admin() {
  return (
    <AdminLayout>
      <TenantsPage />
    </AdminLayout>
  );
}

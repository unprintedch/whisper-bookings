import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DashboardRedirect() {
  // Redirect to proper Dashboard page
  return <Navigate to={createPageUrl("Dashboard")} replace />;
}
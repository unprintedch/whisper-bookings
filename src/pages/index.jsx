import React from 'react';
import { Navigate } from 'react-router-dom';

export default function IndexPage() {
  // Redirect directly to Dashboard page
  return <Navigate to="/Dashboard" replace />;
}
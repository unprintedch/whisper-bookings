import React from 'react';
import { Navigate } from 'react-router-dom';

export default function IndexPage() {
  // Redirect directly to Home page
  return <Navigate to="/Home" replace />;
}
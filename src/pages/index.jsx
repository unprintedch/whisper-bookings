import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function IndexPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/Home', { replace: true });
  }, [navigate]);
  
  return null;
}
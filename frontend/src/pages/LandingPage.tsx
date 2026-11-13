import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * LandingPage redirects directly to Hospital Staff Login.
 * All marketing banners, NEWS2 engine copy, and patient portal cards
 * have been permanently removed as requested.
 */
export function LandingPage() {
  return <Navigate to="/login" replace />;
}

export default LandingPage;

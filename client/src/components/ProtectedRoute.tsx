import React, { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Redirect, Route, RouteProps } from 'wouter'; // Assuming wouter is used as per project description
import { Spinner } from './ui/spinner'; // Assuming a spinner component exists

interface ProtectedRouteProps extends Omit<RouteProps, 'component'> {
  component: React.ComponentType<any>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, ...rest }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show a loading spinner or some placeholder while checking auth status
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="large" /> 
      </div>
    );
  }

  return (
    <Route
      {...rest}
      component={(props) =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export default ProtectedRoute;

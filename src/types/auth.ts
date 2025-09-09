export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
  };
  token: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthVariables {
  user: AuthenticatedUser;
}

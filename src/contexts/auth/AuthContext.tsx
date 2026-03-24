import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    type ReactNode,
} from "react";

import api from "../../services/api";
import type { AuthUserPayload } from "../../services/authService";

const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "auth_user";

type NotificationChannels = {
    whatsapp: boolean;
    email: boolean;
};

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    phone: string;
    notificationsEnabled: boolean;
    notificationChannels: NotificationChannels;
};

type UserProfileUpdate = {
    name: string;
    phone: string;
    notificationsEnabled: boolean;
    notificationChannels: NotificationChannels;
};

type AuthContextType = {
    isAuthenticated: boolean;
    user: AuthUser | null;
    login: (token: string, user?: AuthUserPayload) => void;
    logout: (message?: string) => void;
    updateUserProfile: (profile: UserProfileUpdate) => void;
    message: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);

function getStoredUser(): AuthUser | null {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser) as AuthUser;
    } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
    }
}

function createDefaultUser(): AuthUser {
    return {
        id: "",
        name: "Usuário",
        email: "",
        phone: "",
        notificationsEnabled: false,
        notificationChannels: {
            whatsapp: false,
            email: false,
        },
    };
}

function persistUser(user: AuthUser | null) {
    if (!user) {
        localStorage.removeItem(USER_STORAGE_KEY);
        return;
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function getFallbackName(email: string): string {
    const localPart = email.split("@")[0]?.trim();
    if (!localPart) {
        return "Usuário";
    }

    return localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function mergeUserProfile(incomingUser?: AuthUserPayload, currentUser?: AuthUser | null): AuthUser | null {
    if (!incomingUser && !currentUser) {
        return null;
    }

    const email = incomingUser?.email ?? currentUser?.email ?? "";
    const name = incomingUser?.name ?? currentUser?.name ?? getFallbackName(email);

    return {
        id: incomingUser?.id ?? currentUser?.id ?? "",
        email,
        name,
        phone: incomingUser?.phone ?? currentUser?.phone ?? "",
        notificationsEnabled: incomingUser?.notificationsEnabled ?? currentUser?.notificationsEnabled ?? false,
        notificationChannels: {
            whatsapp: incomingUser?.notificationChannels?.whatsapp ?? currentUser?.notificationChannels.whatsapp ?? false,
            email: incomingUser?.notificationChannels?.email ?? currentUser?.notificationChannels.email ?? false,
        },
    };
}

export function AuthProvider({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    const [token, setToken] = useState(
        localStorage.getItem(TOKEN_STORAGE_KEY)
    );
    const [user, setUser] = useState<AuthUser | null>(() => {
        const storedUser = getStoredUser();
        if (storedUser) {
            return storedUser;
        }

        return localStorage.getItem(TOKEN_STORAGE_KEY) ? createDefaultUser() : null;
    });
    const [message, setMessage] = useState<string | null>(
        null
    );

    const isAuthenticated = !!token;

    function login(newToken: string, incomingUser?: AuthUserPayload) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        setToken(newToken);
        setUser(currentUser => {
            const nextUser = mergeUserProfile(incomingUser, currentUser ?? createDefaultUser());
            persistUser(nextUser);
            return nextUser;
        });
        setMessage(null);
    }

    function logout(msg?: string) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        persistUser(null);
        setToken(null);
        setUser(null);
        if (msg) setMessage(msg);
    }

    function updateUserProfile(profile: UserProfileUpdate) {
        setUser(currentUser => {
            if (!currentUser) {
                return currentUser;
            }

            const nextUser: AuthUser = {
                ...currentUser,
                ...profile,
                notificationChannels: profile.notificationsEnabled
                    ? profile.notificationChannels
                    : { whatsapp: false, email: false },
            };

            persistUser(nextUser);
            return nextUser;
        });
    }

    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            response => response,
            error => {
                const status = error.response?.status;
                const url = error.config?.url;
                if (status === 401) {                    
                    if (url?.includes("/auth/login")) {
                        return Promise.reject(error);
                    }                    
                    logout("Sessão expirada. Faça login novamente.");
                }

                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, []);

    const contextValue = useMemo(() => ({
        isAuthenticated,
        user,
        login,
        logout,
        updateUserProfile,
        message,
    }), [isAuthenticated, user, message]);

    return (
        <AuthContext.Provider
            value={contextValue}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
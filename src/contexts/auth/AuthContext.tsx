import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";

import api from "../../services/api";

type AuthContextType = {
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: (message?: string) => void;
    message: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [token, setToken] = useState(
        localStorage.getItem("token")
    );
    const [message, setMessage] = useState<string | null>(
        null
    );

    const isAuthenticated = !!token;

    function login(newToken: string) {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setMessage(null);
    }

    function logout(msg?: string) {
        localStorage.removeItem("token");
        setToken(null);
        if (msg) setMessage(msg);
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

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                login,
                logout,
                message,
            }}
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
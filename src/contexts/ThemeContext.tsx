import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // 检测系统主题
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // 计算实际主题
  const calculateActualTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
      setActualTheme(calculateActualTheme(savedTheme));
    } else {
      setTheme('light');
      setActualTheme('light');
    }
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (theme === 'system') {
          setActualTheme(getSystemTheme());
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // 更新主题
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setActualTheme(calculateActualTheme(newTheme));
    localStorage.setItem('theme', newTheme);
  };

  // 应用主题到 document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      
      // 移除所有主题类
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');
      
      // 添加当前主题类
      root.classList.add(actualTheme);
      body.classList.add(actualTheme);
      
      // 强制更新根容器的主题属性
      root.setAttribute('data-theme', actualTheme);
      body.setAttribute('data-theme', actualTheme);
      
      // 在iframe环境中，也尝试更新根div
      const rootDiv = document.getElementById('root');
      if (rootDiv) {
        rootDiv.setAttribute('data-theme', actualTheme);
      }
    }
  }, [actualTheme]);

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
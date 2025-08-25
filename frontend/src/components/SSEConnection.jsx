/**
 * Компонент для управления SSE подключением
 * Автоматически подключается при входе пользователя
 */

import React, { useEffect } from 'react';
import { useSSE } from '../hooks/useSSE';
import eventBus from '../utils/EventBus';

const SSEConnection = ({ user, children }) => {
  // Подключаемся к SSE только если пользователь аутентифицирован
  const { isConnected, reconnectAttempts, maxReconnectAttempts } = useSSE({
    enabled: !!user, // Включаем SSE только если есть пользователь
    reconnectDelay: 3000,
    maxReconnectAttempts: 5
  });

  // Подписываемся на системные события для отладки
  useEffect(() => {
    const handleConnectionLost = (event) => {
      console.warn('🔴 [SSE] Соединение потеряно:', event);
    };

    const handleConnectionRestored = (event) => {
      console.log('🟢 [SSE] Соединение восстановлено:', event);
    };

    eventBus.subscribe('system.connectionLost', 'sse-connection', handleConnectionLost);
    eventBus.subscribe('system.connectionRestored', 'sse-connection', handleConnectionRestored);

    return () => {
      eventBus.unsubscribeAll('sse-connection');
    };
  }, []);

  // Отображаем статус подключения в development режиме
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        {children}
        <SSEStatusIndicator 
          isConnected={isConnected}
          reconnectAttempts={reconnectAttempts}
          maxReconnectAttempts={maxReconnectAttempts}
          user={user}
        />
      </>
    );
  }

  return children;
};

/**
 * Индикатор статуса SSE подключения (только для разработки)
 */
const SSEStatusIndicator = ({ isConnected, reconnectAttempts, maxReconnectAttempts, user }) => {
  if (!user) {
    return null; // Не показываем индикатор если пользователь не аутентифицирован
  }

  const getStatusColor = () => {
    if (isConnected) return '#4caf50'; // Зеленый
    if (reconnectAttempts > 0) return '#ff9800'; // Оранжевый
    return '#f44336'; // Красный
  };

  const getStatusText = () => {
    if (isConnected) return 'SSE подключен';
    if (reconnectAttempts > 0) return `SSE переподключение (${reconnectAttempts}/${maxReconnectAttempts})`;
    return 'SSE отключен';
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          animation: isConnected ? 'none' : 'pulse 2s infinite'
        }}
      />
      <span>{getStatusText()}</span>
      
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SSEConnection;
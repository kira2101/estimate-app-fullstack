/**
 * Компонент для мониторинга Event Bus (только для разработки)
 * Показывает статистику событий, активные подписки и логи
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import { Monitor as MonitorIcon, Refresh as RefreshIcon, Clear as ClearIcon } from '@mui/icons-material';
import eventBus from '../utils/EventBus';
import { useEventBusStats, useEventBusListener } from '../hooks/useEventBus';
import { ALL_EVENTS, getEventCategory } from '../utils/EventTypes';

/**
 * Компонент мониторинга Event Bus
 */
const EventBusMonitor = ({ open, onClose }) => {
  const [enabled, setEnabled] = useState(false);
  const [eventLog, setEventLog] = useState([]);
  const [maxLogSize] = useState(100);
  const stats = useEventBusStats(enabled);

  // Подписка на все события для логирования
  useEventBusListener(
    Object.values(ALL_EVENTS),
    (eventData) => {
      if (!enabled) return;
      
      const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        type: eventData.type || 'unknown',
        category: getEventCategory(eventData.type || ''),
        data: eventData.data || {},
        metadata: eventData.metadata || {}
      };
      
      setEventLog(prevLog => {
        const newLog = [logEntry, ...prevLog];
        return newLog.slice(0, maxLogSize);
      });
    },
    [enabled],
    { enabled }
  );

  const handleClearLog = () => {
    setEventLog([]);
  };

  const handleRefreshStats = () => {
    // Принудительно обновляем статистику
    if (enabled) {
      setEnabled(false);
      setTimeout(() => setEnabled(true), 100);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      estimate: 'primary',
      project: 'secondary',
      user: 'info',
      workCategory: 'warning',
      workType: 'success',
      auth: 'error',
      system: 'default'
    };
    return colors[category] || 'default';
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MonitorIcon />
        Event Bus Monitor
        <Box sx={{ flexGrow: 1 }} />
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              color="primary"
            />
          }
          label="Включить мониторинг"
        />
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefreshStats}
          disabled={!enabled}
          size="small"
        >
          Обновить
        </Button>
        <Button
          startIcon={<ClearIcon />}
          onClick={handleClearLog}
          size="small"
          color="warning"
        >
          Очистить лог
        </Button>
      </DialogTitle>
      
      <DialogContent>
        {!enabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Включите мониторинг для просмотра статистики и логов событий
          </Alert>
        )}

        {/* Статистика */}
        {enabled && stats && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Статистика Event Bus
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Paper sx={{ p: 2, minWidth: 150 }}>
                <Typography variant="h4" color="primary">
                  {stats.totalEventTypes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Типов событий
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, minWidth: 150 }}>
                <Typography variant="h4" color="secondary">
                  {stats.totalSubscriptions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Активных подписок
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, minWidth: 150 }}>
                <Typography variant="h4" color="info">
                  {eventLog.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  События в логе
                </Typography>
              </Paper>
            </Box>

            {/* Подписки по типам событий */}
            {Object.keys(stats.eventTypes).length > 0 && (
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Тип события</TableCell>
                      <TableCell>Категория</TableCell>
                      <TableCell align="right">Подписчиков</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stats.eventTypes).map(([eventType, count]) => (
                      <TableRow key={eventType}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {eventType}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getEventCategory(eventType)}
                            color={getCategoryColor(getEventCategory(eventType))}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Лог событий */}
        {enabled && eventLog.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Лог событий (последние {eventLog.length})
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Время</TableCell>
                    <TableCell>Событие</TableCell>
                    <TableCell>Категория</TableCell>
                    <TableCell>Источник</TableCell>
                    <TableCell>Данные</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventLog.map((entry) => (
                    <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {formatTimestamp(entry.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {entry.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={entry.category}
                          color={getCategoryColor(entry.category)}
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {entry.metadata.source || 'unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.75rem', 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {JSON.stringify(entry.data).substring(0, 100)}
                          {JSON.stringify(entry.data).length > 100 && '...'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {enabled && eventLog.length === 0 && (
          <Alert severity="info">
            Лог событий пуст. События будут появляться здесь по мере их возникновения.
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventBusMonitor;
import { useEffect, useRef, useState } from 'react';
import { applyBackup, backupFileName, buildBackup, parseBackup } from '~/lib/backup';
import type { BackupFile } from '~/lib/backup';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '~/lib/storage';
import type { AppSettings } from '~/lib/types';
import type { AiCallLog } from '~/lib/aiLog';
import type { ViewCtx } from '../App';
import { Bottom } from '../ui';

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid var(--cm-line)',
        cursor: 'pointer',
      }}
    >
      <span>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 10, color: 'var(--cm-ink-3)', marginTop: 3 }}>
          {hint}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: 'var(--cm-accent)' }}
      />
    </label>
  );
}

export default function SettingsView({ ctx }: { ctx: ViewCtx }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [logs, setLogs] = useState<AiCallLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [importPreview, setImportPreview] = useState<{ data: BackupFile; name: string } | null>(null);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    try {
      const backup = await buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg({
        ok: true,
        text: `已导出 ${backup.tasks.length} 条事项${backup.settings ? '（含设置）' : ''}。文件里有 API Key，请像保管密码一样保管它。`,
      });
    } catch (error) {
      setBackupMsg({ ok: false, text: error instanceof Error ? error.message : '导出失败' });
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      setBackupMsg(null);
      setImportPreview({ data, name: file.name });
    } catch (error) {
      setImportPreview(null);
      setBackupMsg({ ok: false, text: error instanceof Error ? error.message : '读取失败' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    try {
      await applyBackup(importPreview.data);
      setImportPreview(null);
      setBackupMsg({
        ok: true,
        text: `已恢复 ${importPreview.data.tasks.length} 条事项，设置已覆盖。`,
      });
      await ctx.refresh();
    } catch (error) {
      setBackupMsg({ ok: false, text: error instanceof Error ? error.message : '恢复失败' });
    }
  };

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  const patch = (value: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...value }));
    setSaved(false);
  };

  const save = async () => {
    await saveSettings(settings);
    setSaved(true);
  };

  const loadLogs = async () => {
    try {
      const result = (await chrome.runtime.sendMessage({ type: 'GET_AI_LOGS' })) as AiCallLog[];
      setLogs(Array.isArray(result) ? result : []);
    } catch {
      setLogs([]);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = (await chrome.runtime.sendMessage({
        type: 'TEST_AI',
        settings,
      })) as { ok: boolean; message: string };
      setTestResult(result ?? { ok: false, message: '没有返回结果' });
      void loadLogs();
    } catch (error) {
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : '请求失败',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="cm-body">
        <div className="cm-title" style={{ paddingTop: 14 }}>设置</div>

        <div className="cm-section" style={{ paddingTop: 4 }}>调度</div>
        <div style={{ padding: '0 16px' }}>
          <div className="cm-field-row">
            <div className="cm-field">
              <label className="cm-label" htmlFor="st-time">每日签到时间</label>
              <input
                id="st-time"
                className="cm-input mono"
                value={settings.checkinTime}
                onChange={(e) => patch({ checkinTime: e.target.value })}
              />
            </div>
            <div className="cm-field">
              <label className="cm-label" htmlFor="st-jitter">随机延后（分钟）</label>
              <input
                id="st-jitter"
                className="cm-input mono"
                value={String(settings.jitterMin)}
                onChange={(e) => patch({ jitterMin: Number.parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>
          <div className="cm-field">
            <label className="cm-label" htmlFor="st-review">长周期默认回访频率（天）</label>
            <input
              id="st-review"
              className="cm-input mono"
              value={String(settings.reviewEveryDays)}
              onChange={(e) => patch({ reviewEveryDays: Number.parseInt(e.target.value, 10) || 7 })}
            />
          </div>
          <Toggle
            label="失败与回访通知"
            hint="成功和「已领过」始终静默，不会打扰你。"
            checked={settings.notifyEnabled}
            onChange={(notifyEnabled) => patch({ notifyEnabled })}
          />
        </div>

        <div className="cm-divider" />

        <div className="cm-section">识别模型（可选）</div>
        <div style={{ padding: '0 16px' }}>
          <Toggle
            label="使用 AI 识别"
            hint="不开启时使用本地规则识别，不需要任何 Key，也不上传页面内容。"
            checked={settings.aiEnabled}
            onChange={(aiEnabled) => patch({ aiEnabled })}
          />
          {settings.aiEnabled && (
            <>
              <div className="cm-field" style={{ marginTop: 10 }}>
                <label className="cm-label" htmlFor="st-endpoint">API 端点（OpenAI 兼容）</label>
                <input
                  id="st-endpoint"
                  className="cm-input mono"
                  value={settings.aiEndpoint}
                  onChange={(e) => patch({ aiEndpoint: e.target.value })}
                />
              </div>
              <div className="cm-field">
                <label className="cm-label" htmlFor="st-model">模型</label>
                <input
                  id="st-model"
                  className="cm-input mono"
                  value={settings.aiModel}
                  onChange={(e) => patch({ aiModel: e.target.value })}
                />
              </div>
              <div className="cm-field">
                <label className="cm-label" htmlFor="st-key">API Key（只存在本机）</label>
                <input
                  id="st-key"
                  className="cm-input mono"
                  type="password"
                  value={settings.aiKey}
                  onChange={(e) => patch({ aiKey: e.target.value })}
                />
              </div>
              <button
                className="cm-btn cm-btn-ghost cm-btn-block"
                style={{ marginBottom: 10 }}
                onClick={() => void runTest()}
                disabled={testing}
              >
                {testing ? '正在测试…' : '测试连接'}
              </button>
              {testResult && (
                <div
                  className={testResult.ok ? 'cm-notice' : 'cm-error'}
                  style={{ marginBottom: 10, margin: 0 }}
                >
                  <b>{testResult.ok ? '成功' : '失败'}</b>
                  <span style={{ wordBreak: 'break-all' }}>{testResult.message}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, margin: '4px 0 10px' }}>
                <button
                  className="cm-btn-mini"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowLogs((v) => !v);
                    if (!showLogs) void loadLogs();
                  }}
                >
                  {showLogs ? '收起请求诊断' : '查看请求诊断'}
                </button>
                {showLogs && (
                  <button
                    className="cm-btn-mini"
                    onClick={() => void (async () => {
                      await chrome.runtime.sendMessage({ type: 'CLEAR_AI_LOGS' });
                      await loadLogs();
                    })()}
                  >
                    清空
                  </button>
                )}
              </div>

              {showLogs && (
                <div style={{ marginBottom: 12 }}>
                  {logs.length === 0 ? (
                    <div className="cm-hint">还没有请求记录。点「测试连接」或圈选一次会在这里留下完整诊断。</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="cm-ailog" style={{ borderColor: log.ok ? 'var(--cm-ok)' : 'var(--cm-accent)' }}>
                        <div className="cm-ailog-head">
                          <span className={log.ok ? 'cm-pass' : 'cm-fail'}>
                            {log.ok ? '成功' : '失败'}
                          </span>
                          <span className="mono" style={{ fontSize: 10 }}>
                            {log.purpose === 'test' ? '测试连接' : '识别'} · HTTP {log.status ?? '无响应'} · {log.durationMs}ms
                          </span>
                        </div>
                        <div className="cm-ailog-row"><span>端点</span><code>{log.endpoint}</code></div>
                        <div className="cm-ailog-row"><span>模型</span><code>{log.model || '(空)'}</code></div>
                        {log.error && (
                          <div className="cm-ailog-row"><span>网络错误</span><code style={{ color: 'var(--cm-accent)' }}>{log.error}</code></div>
                        )}
                        {log.headers && Object.keys(log.headers).length > 0 && (
                          <div className="cm-ailog-row">
                            <span>响应头</span>
                            <code>{Object.entries(log.headers).map(([k, v]) => `${k}: ${v}`).join(' | ')}</code>
                          </div>
                        )}
                        {log.responseBody && (
                          <div className="cm-ailog-row">
                            <span>响应正文</span>
                            <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 140, overflow: 'auto', display: 'block' }}>
                              {log.responseBody}
                            </code>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
          <div className="cm-notice" style={{ marginTop: 12 }}>
            <b>隐私</b>
            <span>
              模型只在创建或重新识别时调用；每日执行是确定性规则，不调用模型、不上传页面内容。圈选截图不落盘。
            </span>
          </div>
        </div>

        <div className="cm-divider" />

        <div className="cm-section">数据与备份</div>
        <div style={{ padding: '0 16px 16px' }}>
          <div className="cm-hint" style={{ paddingBottom: 8 }}>
            数据存在浏览器里、按扩展 ID 隔离：重新加载不丢；<b>移除扩展会清空全部事项</b>，
            换文件夹路径加载也一样（ID 会变）。重装或换电脑前，先导出一份。
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="cm-btn cm-btn-ghost" style={{ flex: 1 }} onClick={() => void exportBackup()}>
              导出备份
            </button>
            <button
              className="cm-btn cm-btn-ghost"
              style={{ flex: 1 }}
              onClick={() => fileRef.current?.click()}
            >
              导入恢复
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            aria-label="选择备份文件"
            style={{ display: 'none' }}
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
          {importPreview && (
            <div className="cm-confirm" style={{ marginTop: 8 }}>
              <div className="cm-confirm-title">导入「{importPreview.name}」？</div>
              <div className="cm-confirm-text">
                包含 {importPreview.data.tasks.length} 条事项
                {importPreview.data.exportedAt
                  ? `，导出于 ${new Date(importPreview.data.exportedAt).toLocaleString('zh-CN')}`
                  : ''}
                。恢复会<b>覆盖</b>现有的全部事项和设置。
              </div>
              <div className="cm-confirm-actions">
                <button
                  className="cm-btn-danger"
                  onClick={() => void confirmImport()}
                >
                  覆盖导入
                </button>
                <button className="cm-btn cm-btn-ghost" onClick={() => setImportPreview(null)}>
                  取消
                </button>
              </div>
            </div>
          )}
          {backupMsg && (
            <div className={backupMsg.ok ? 'cm-notice' : 'cm-error'} style={{ marginTop: 8 }}>
              <b>{backupMsg.ok ? '完成' : '失败'}</b>
              <span>{backupMsg.text}</span>
            </div>
          )}
        </div>

        <div className="cm-divider" />

        <div className="cm-section">边界</div>
        <div className="cm-hint" style={{ padding: '0 16px 20px' }}>
          浏览器需要保持打开，自动签到才会执行。关机期间不跑，重新打开后补领漏掉的任务。<br />
          设备睡眠时不会唤醒执行；未登录或遇验证码会转人工，不代填凭据、不破解验证码。
        </div>
      </div>

      <Bottom>
        <button className="cm-btn cm-btn-primary" onClick={() => void save()}>
          {saved ? '已保存' : '保存设置'}
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={() => ctx.navigate({ name: 'today' })}>
          返回今日
        </button>
      </Bottom>
    </>
  );
}

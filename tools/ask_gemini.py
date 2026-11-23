#!/usr/bin/env python3
"""請 Gemini 讀遊戲程式、回答問題（給意見、寫報告用）。

用法：python3 tools/ask_gemini.py "問題" [輸出檔.md] [模型]
- 會把 README.md、CLAUDE.md、src/*.js 一起送給 Gemini。
- 金鑰存在雲端環境的「網路密鑰」裡，由網路代理自動加上；程式裡不用、也不要放金鑰。
- 預設模型 gemini-3-flash-preview（免費版可用）；忙線時會自動換下一個模型再試。
"""
import glob, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.5-flash']

def bundle():
    parts = []
    for p in ['README.md', 'CLAUDE.md'] + sorted(glob.glob(os.path.join(ROOT, 'src', '*.js'))):
        path = p if os.path.isabs(p) else os.path.join(ROOT, p)
        with open(path, encoding='utf-8') as f:
            parts.append(f'===== {os.path.relpath(path, ROOT)} =====\n{f.read()}')
    return '\n\n'.join(parts)

def ask(question, models):
    system = '你是資深遊戲設計顧問。下面是網頁大富翁遊戲「台北政壇大富翁」的完整程式和說明。請用繁體中文、白話、給程式新手看的方式回答，需要時用表格。'
    body = {'messages': [{'role': 'system', 'content': system + '\n\n' + bundle()}, {'role': 'user', 'content': question}]}
    last = None
    for m in models:
        for attempt in range(2):
            req = urllib.request.Request(URL, data=json.dumps({**body, 'model': m}).encode(), headers={
                'Content-Type': 'application/json', 'Authorization': 'Bearer proxy-injected'})
            try:
                with urllib.request.urlopen(req, timeout=600) as r:
                    d = json.load(r)
                return m, d['choices'][0]['message']['content']
            except urllib.error.HTTPError as e:
                last = f'{m}: {e.code} {e.read()[:300]!r}'
                if e.code in (429, 500, 503):
                    time.sleep(5)
                    continue
                break
    raise SystemExit(f'Gemini 沒有回應：{last}')

if __name__ == '__main__':
    q = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    models = [sys.argv[3]] if len(sys.argv) > 3 else MODELS
    model, text = ask(q, models)
    text = f'<!-- Gemini 模型：{model} -->\n{text}'
    if out:
        with open(out, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f'寫好了：{out}（{model}）')
    else:
        print(text)

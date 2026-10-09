#!/usr/bin/env python3
"""安全网：游戏逻辑靠 document.getElementById 抓元素。

改 public/index.html 的结构时，只要有一个被引用的 id 丢了，游戏就会在那一处抛错。
这个脚本把 JS 里引用的 id 和 index.html 里真实存在的 id 对一遍，只读，不改任何文件。

用法：  python3 -I scripts/check-ids.py
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# 由 JS 动态创建、因此不存在于静态 HTML 里的 id
DYNAMIC = re.compile(r'^projectButton\w+$')


def strip_html_comments(text):
    return re.sub(r'<!--.*?-->', '', text, flags=re.S)


def strip_js_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(ln for ln in text.split('\n') if not ln.lstrip().startswith('//'))


def referenced_ids():
    refs = {}
    files = sorted((ROOT / 'public').glob('*.js')) + sorted((ROOT / 'public' / 'plugins').glob('*.js'))
    patterns = [
        re.compile(r"""getElementById\(\s*['"]([^'"]+)['"]\s*\)"""),
        re.compile(r"""querySelector\(\s*['"]#([A-Za-z0-9_-]+)['"]\s*\)"""),
    ]
    for f in files:
        src = strip_js_comments(f.read_text(encoding='utf-8'))
        for pat in patterns:
            for m in pat.finditer(src):
                refs.setdefault(m.group(1), set()).add(f.name)
    return refs


def declared_ids(path):
    html = strip_html_comments(pathlib.Path(path).read_text(encoding='utf-8'))
    ids = set(re.findall(r"""\bid\s*=\s*["']([^"']+)["']""", html))
    ids |= set(re.findall(r"""\bid\s*=\s*([A-Za-z0-9_-]+)[\s>]""", html))
    return ids


def main():
    refs = referenced_ids()
    have = declared_ids(ROOT / 'public' / 'index.html')

    missing = sorted(i for i in set(refs) - have if not DYNAMIC.match(i))
    print(f'JS 引用 id: {len(refs)}    index.html 中声明 id: {len(have)}')

    if missing:
        print(f'\n!! 缺失 {len(missing)} 个 —— 游戏会在这些地方报错:')
        for i in missing:
            print('   ', i, '<-', ','.join(sorted(refs[i])))
        return 1

    print('\nOK — JS 引用的所有 id 都在 index.html 里')
    return 0


if __name__ == '__main__':
    sys.exit(main())

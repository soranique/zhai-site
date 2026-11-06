"""Run parser regression checks without importing build-time dependencies."""
import ast
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent

def parser_module(name):
    tree = ast.parse((ROOT / name).read_text())
    selected = [n for n in tree.body if isinstance(n, (ast.Assign, ast.FunctionDef))]
    scope = {'re': re}
    exec(compile(ast.Module(body=selected, type_ignores=[]), name, 'exec'), scope)
    return scope

ed = parser_module('build_editions.py')
kin = parser_module('build_kinship.py')
for label, expected in [('初日', 1), ('初一日', 1), ('元日', 1), ('初十', 10), ('廿一', 21)]:
    assert ed['day_no'](label) == expected, label
    assert kin['dnum'](label) == expected, label
    assert kin['days_of']('七月', label) == (7, {expected}), label
    assert kin['strict_day']('七月', label) == (7, expected), label
assert kin['days_of']('九月', '初一日至初九日；初十日') == (9, set(range(1, 11)))
assert kin['strict_day']('九月', '初一日至初九日；初十日') is None
assert ed['day_no']('不詳') is None
print('PASS: 23 Python parser assertions; single-day and interval methods remain distinct')

try:
    OSError
except NameError:
    OSError = IOError
try:
    FileNotFoundError
except NameError:
    class FileNotFoundError(OSError):
        pass
class _HFFile:
    def __init__(self, name, mode):
        name = str(name)
        m = mode.replace("b", "").replace("t", "")
        if m[0] == "r" and name not in _HF_FILES:
            raise FileNotFoundError("[Errno 2] No such file or directory: '" + name + "'")
        if m[0] == "w" or (m[0] in "ax" and name not in _HF_FILES):
            _HF_FILES[name] = ""
        self.name = name
        self.mode = mode
        self.closed = False
        self._pos = len(_HF_FILES[name]) if m[0] == "a" else 0
        self._r = m[0] == "r" or "+" in m
        self._w = m[0] != "r" or "+" in m
    def _check(self, want):
        if self.closed:
            raise ValueError("I/O operation on closed file.")
        if not want:
            raise OSError("not readable" if want is self._r else "not writable")
    def read(self, size=-1):
        self._check(self._r)
        d = _HF_FILES[self.name]
        end = len(d) if size is None or size < 0 else self._pos + size
        s = d[self._pos:end]
        self._pos += len(s)
        return s
    def readline(self, size=-1):
        self._check(self._r)
        d = _HF_FILES[self.name]
        i = d.find("\n", self._pos)
        end = len(d) if i < 0 else i + 1
        s = d[self._pos:end]
        self._pos += len(s)
        return s
    def readlines(self):
        out = []
        line = self.readline()
        while line:
            out.append(line)
            line = self.readline()
        return out
    def __iter__(self):
        return iter(self.readlines())
    def write(self, s):
        self._check(self._w)
        if not isinstance(s, str):
            raise TypeError("write() argument must be str, not " + type(s).__name__)
        d = _HF_FILES[self.name]
        if self.mode.replace("b", "")[0] == "a":
            self._pos = len(d)
        _HF_FILES[self.name] = d[:self._pos] + s + d[self._pos + len(s):]
        self._pos += len(s)
        return len(s)
    def writelines(self, lines):
        for line in lines:
            self.write(line)
    def seek(self, pos, whence=0):
        self._pos = pos
        return pos
    def tell(self):
        return self._pos
    def close(self):
        self.closed = True
    def __enter__(self):
        return self
    def __exit__(self, a, b, c):
        self.close()
        return False
def open(file, mode="r", buffering=-1, encoding=None, errors=None, newline=None):
    return _HFFile(file, mode)
def _hf_csv_row(line, delimiter):
    row = []
    cur = ""
    q = False
    i = 0
    while i < len(line):
        ch = line[i]
        if q:
            if ch == '"' and i + 1 < len(line) and line[i + 1] == '"':
                cur += '"'
                i += 1
            elif ch == '"':
                q = False
            else:
                cur += ch
        elif ch == '"':
            q = True
        elif ch == delimiter:
            row.append(cur)
            cur = ""
        else:
            cur += ch
        i += 1
    row.append(cur)
    return row
class _HFCsv:
    def reader(self, lines, delimiter=",", **kw):
        rows = []
        for line in lines:
            line = line.rstrip("\r\n")
            rows.append(_hf_csv_row(line, delimiter))
        return iter(rows)
    def writer(self, f, delimiter=",", **kw):
        return _HFCsvWriter(f, delimiter)
class _HFCsvWriter:
    def __init__(self, f, d):
        self.f = f
        self.d = d
    def writerow(self, row):
        cells = []
        for c in row:
            c = str(c)
            if self.d in c or '"' in c or "\n" in c:
                c = '"' + c.replace('"', '""') + '"'
            cells.append(c)
        self.f.write(self.d.join(cells) + "\n")
    def writerows(self, rows):
        for r in rows:
            self.writerow(r)
csv = _HFCsv()

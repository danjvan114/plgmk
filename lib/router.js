'use strict';

function compile(pattern) {
  const keys = [];
  const source = pattern
    .split('/')
    .map((seg) => {
      if (seg === '') return '';
      if (seg.startsWith(':')) {
        const optional = seg.endsWith('?');
        const name = optional ? seg.slice(1, -1) : seg.slice(1);
        keys.push(name);
        return optional ? '(?:/([^/]+))?' : '/([^/]+)';
      }
      if (seg === '*') {
        keys.push('wildcard');
        return '/(.*)';
      }
      return '/' + seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return { regex: new RegExp('^' + (source || '/') + '/?$'), keys };
}

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const { regex, keys } = compile(pattern);
    this.routes.push({ method: method.toUpperCase(), pattern, regex, keys, handler });
    return this;
  }

  get(pattern, handler) {
    return this.add('GET', pattern, handler);
  }

  post(pattern, handler) {
    return this.add('POST', pattern, handler);
  }

  put(pattern, handler) {
    return this.add('PUT', pattern, handler);
  }

  del(pattern, handler) {
    return this.add('DELETE', pattern, handler);
  }

  patch(pattern, handler) {
    return this.add('PATCH', pattern, handler);
  }

  match(method, pathname) {
    const m = method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== m && route.method !== 'ANY') continue;
      const res = route.regex.exec(pathname);
      if (!res) continue;
      const params = {};
      route.keys.forEach((key, i) => {
        const value = res[i + 1];
        params[key] = value === undefined ? undefined : decodeURIComponent(value);
      });
      return { handler: route.handler, params, route };
    }
    for (const route of this.routes) {
      if (route.method !== 'ANY' && route.method !== m) continue;
    }
    return null;
  }

  list() {
    return this.routes.map((r) => `${r.method.padEnd(6)} ${r.pattern}`);
  }
}

module.exports = Router;
module.exports.compile = compile;

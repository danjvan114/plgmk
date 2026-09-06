(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const ua = App.urlAvatar;

  function iconImg(p, size) {
    const s = size || 52;
    if (p.icon) return `<img class="badge-square" style="width:${s}px;height:${s}px" src="${A(p.icon)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
    return `<div class="badge-square" style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;font-size:22px;background:linear-gradient(135deg,#6750a4,#8e6fd8);color:#fff"><span class="material-icons">extension</span></div>`;
  }

  function tagChips(tags, base) {
    return (tags || []).slice(0, 4).map((t) => {
      const href = (base || '/market') + '?tag=' + encodeURIComponent(t);
      return `<a href="${href}" style="display:inline-block;font-size:12px;padding:1px 8px;border-radius:20px;background:var(--mdui-color-secondary-container,#e8def8);color:var(--mdui-color-on-secondary-container,#1d192b);margin-right:6px">#${A(t)}</a>`;
    }).join('');
  }

  function pluginCard(p) {
    const nick = p.authorNick || p.author;
    return `
  <div class="plugin-card mdui-ripple fade-enter" onclick="location.href='/plugin/${p.id}'" role="link" tabindex="0"
       onkeydown="if(event.key==='Enter')location.href='/plugin/${p.id}'">
    <div class="plugin-card-top">
      ${iconImg(p)}
      <div class="pc-body">
        <h3 class="pc-name">${A(p.name)} <span style="font-size:12px;color:var(--mdui-color-on-surface-variant);font-weight:400">v${A(p.version || '')}</span></h3>
        <p class="pc-desc">${A((p.description || '').slice(0, 120))}</p>
      </div>
    </div>
    <div class="pc-meta">
      <span class="author"><img src="${ua({ nickname: nick, avatar: p.authorAvatar })}" style="width:20px;height:20px;border-radius:50%" onerror="this.style.display='none'"> ${A(nick)} ${App.badgeVerified(p.authorVerified)}</span>
      <span class="star-row">${App.starHtml(p.rating)}</span>
    </div>
    <div class="pc-meta">${tagChips(p.tags)}</div>
    <div class="pc-foot">
      <div class="pc-meta" style="gap:12px">
        <span title="下载"><span class="material-icons" style="font-size:15px;vertical-align:-3px">download</span> ${p.downloadCount || 0}</span>
        <span title="点赞"><span class="material-icons" style="font-size:15px;vertical-align:-3px">thumb_up</span> ${p.likeCount || 0}</span>
        <span title="浏览"><span class="material-icons" style="font-size:15px;vertical-align:-3px">visibility</span> ${p.viewCount || 0}</span>
      </div>
      <button class="btn sm tonal" onclick="event.stopPropagation();window.open('/api/market/plugins/${p.id}/download')"><span class="material-icons" style="font-size:15px">download</span>下载</button>
    </div>
  </div>`;
  }

  function workCard(w) {
    const nick = w.authorNick || w.author;
    const cover = w.thumbnail
      ? `<img class="work-card-cover" src="${A(w.thumbnail)}" loading="lazy" onerror="this.style.visibility='hidden'">`
      : `<div class="work-card-cover" style="position:relative;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#3949ab,#7e57c2)"><span class="material-icons" style="font-size:42px;color:#fff">rocket_launch</span><span style="position:absolute;bottom:8px;left:0;right:0;text-align:center;color:#fff;font-size:12px;opacity:.92">运行作品</span></div>`;
    return `
  <div class="plugin-card mdui-ripple fade-enter" onclick="location.href='/work/${w.id}'" role="link" tabindex="0"
       onkeydown="if(event.key==='Enter')location.href='/work/${w.id}'">
    ${cover}
    <h3 class="pc-name" style="margin-top:2px">${A(w.title)}</h3>
    <p class="pc-desc">${A((w.description || '').slice(0, 100))}</p>
    <div class="pc-meta">
      <span class="author"><img src="${ua({ nickname: nick, avatar: w.authorAvatar })}" style="width:20px;height:20px;border-radius:50%" onerror="this.style.display='none'"> ${A(nick)} ${App.badgeVerified(w.authorVerified)}</span>
      <span>${App.timeAgo(w.createdAt)}</span>
    </div>
    <div class="pc-foot">
      <div class="pc-meta" style="gap:12px">
        <span><span class="material-icons" style="font-size:15px;vertical-align:-3px">thumb_up</span> ${w.likeCount || 0}</span>
        <span><span class="material-icons" style="font-size:15px;vertical-align:-3px">star</span> ${w.favCount || 0}</span>
        <span><span class="material-icons" style="font-size:15px;vertical-align:-3px">comment</span> ${w.commentCount || 0}</span>
      </div>
      <button class="btn sm tonal" onclick="event.stopPropagation();location.href='/work/${w.id}'">查看</button>
    </div>
  </div>`;
  }

  function postRow(p) {
    return `
  <div class="post-list-item mdui-ripple" onclick="location.href='/post/${p.id}'" role="link" tabindex="0"
       onkeydown="if(event.key==='Enter')location.href='/post/${p.id}'">
    <div class="main">
      <div class="post-title" style="color:var(--mdui-color-on-surface)">
        ${p.isPinned ? '<span class="material-icons" style="font-size:16px;vertical-align:-3px;color:#e65100">push_pin</span> ' : ''}${A(p.title)}
      </div>
      <div class="meta">
        <span>${A(p.authorNick || p.author)} ${App.badgeVerified(p.authorVerified)}</span>
        <span>${A(p.boardName || '')}</span>
        <span>${App.timeAgo(p.lastReplyAt || p.createdAt)}${p.lastReplyBy ? ' · 最后回复 ' + A(p.lastReplyNick || p.lastReplyBy) : ''}</span>
      </div>
    </div>
    <div class="post-nums">
      <span><b>${p.replyCount || 0}</b>回复</span>
      <span><b>${p.viewCount || 0}</b>浏览</span>
    </div>
  </div>`;
  }

  function replyRow(r, postId, onDelete) {
    const nick = r.authorNick || r.author;
    const isDel = r.status === 'deleted';
    const rootCls = r.parentId ? 'reply-child' : '';
    const actions = [];
    if (!isDel) {
      actions.push(`<a href="javascript:;" data-act="reply" data-id="${r.id}" data-name="${A(nick)}">回复</a>`);
      if (App.state.me && (App.state.me.username === r.author || App.state.me.isAdmin)) {
        actions.push(`<a href="javascript:;" data-act="del" data-id="${r.id}">删除</a>`);
      }
      if (App.state.me && App.state.me.isAdmin) {
        actions.push(`<a href="javascript:;" data-act="pin" data-id="${r.id}">${r.isPinned ? '取消置顶' : '置顶'}</a>`);
      }
    }
    return `
  <div class="reply-item ${rootCls} fade-enter" data-reply="${r.id}" id="reply-${r.id}">
    <div class="avatar-wrap">
      <img src="${ua({ nickname: nick, avatar: r.authorAvatar })}" style="width:38px;height:38px;border-radius:50%;flex:none" onerror="this.style.display='none'">
      <div class="body">
        <div class="top">
          <a href="${App.userUrl(r.author)}" style="font-weight:600;font-size:14px">${A(nick)} ${App.badgeVerified(r.authorVerified)}</a>
          ${r.isAuthor ? '<span class="chip tonal">楼主</span>' : ''}
          ${r.isPinned ? '<span class="material-icons" style="font-size:15px;color:#e65100;vertical-align:-3px">push_pin</span>' : ''}
          <span style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${App.timeAgo(r.createdAt)}</span>
        </div>
        <div class="reply-content">${r.replyTo ? `<b style="color:var(--mdui-color-primary)">回复 ${A(r.replyToNick || r.replyTo)}：</b>` : ''}${App.renderRich(r.content)}</div>
        <div class="reply-actions">${actions.join('')}</div>
      </div>
    </div>
  </div>`;
  }

  App.cards = { iconImg, tagChips, pluginCard, workCard, postRow, replyRow };
})();

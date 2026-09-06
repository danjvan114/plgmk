/* ===== 社区页面多语言适配(六语种) =====
   扫描 body 文本节点,按中文原文词典替换;与 nav.js 的 localStorage(knexpanse-lang) 同步。
   路由/动态内容变化时自动重扫(MutationObserver 防抖)。 */
(function () {
  'use strict';
  var LANGS = ['zh','tw','en','ja','ko','es'];
  /* key=中文原文, v=[tw,en,ja,ko,es] */
  var D = {
    /* ---- 补齐:页面静态文本(此前未收录,切换语言时不翻译) ---- */
    'CCvue框架': ['CCvue框架','CCvue Framework','CCvueフレームワーク','CCvue 프레임워크','Framework CCvue'],
    '铁路mc服务器': ['鐵路MC伺服器','Railway MC Server','鉄道MCサーバー','철도 MC 서버','Servidor de MC ferroviario'],
    '一个基于minecraft的铁路服务器，为玩家提供铁路玩法~': ['一個基於minecraft的鐵路服務器，為玩家提供鐵路玩法~','A Minecraft-based railway server with railway gameplay~','Minecraftベースの鉄道サーバー、鉄道プレイを提供~','마인크래프트 기반 철도 서버, 철도 플레이 제공~','Un servidor ferroviario de Minecraft con jugabilidad de ferrocarril~'],
    '一个基于vue的框架，用于快速开发web游戏应用': ['一個基於vue的框架，用於快速開發web遊戲應用','A Vue-based framework for rapidly building web games','Vueベースのフレームワーク、Webゲームを素早く開発','Vue 기반 프레임워크, 웹 게임 신속 개발','Un framework Vue para crear juegos web rápidamente'],
    '一站式编程工具，方便快捷的编程（扫码体验）': ['一站式編程工具，方便快捷的編程（掃碼體驗）','One-stop coding tool, quick and easy (scan to try)','ワンストップ编程ツール、迅速・簡単（QR体験）','원스톱 코딩 도구, 빠르고 편리한 프로그래밍(QR 체험)','Herramienta de programación todo en uno (escanea para probar)'],
    'KE云盘，存储你的项目文件': ['KE雲盤，存儲你的項目文件','KE Cloud - store your project files','KEクラウド、プロジェクトファイルを保存','KE 클라우드, 프로젝트 파일 저장','KE Cloud, guarda tus archivos de proyecto'],
    '不会凉凉发社区~~': ['不會涼涼發社區~~','A community that will not die~~','廃れないコミュニティ~~','망하지 않는 커뮤니티~~','Una comunidad que no morirá~~'],
    'QQ 号': ['QQ 號','QQ Number','QQ番号','QQ 번호','Número de QQ'],
    'QQ 号（团队图标）': ['QQ 號（團隊圖標）','QQ Number (team icon)','QQ番号（チームアイコン）','QQ 번호(팀 아이콘)','Número de QQ (icono de equipo)'],
    '你的页面跑路了': ['你的頁面跑路了','This page has run away','ページが逃げました','페이지가 도망갔어요','Esta página se escapó'],
    '保存告示牌': ['保存告示牌','Save board','掲示板を保存','게시판 저장','Guardar tablón'],
    '创建你的团队，组织成员、共建共有作品与帖子。': ['創建你的團隊，組織成員、共建共有作品與帖子。','Create your team, organize members, co-build works and posts.','チームを作成し、メンバーを組織し、共同作品と投稿を共建しましょう。','팀을 만들고 구성원을 조직하고 공동 작품과 게시물을 함께 만들어 보세요.','Crea tu equipo, organiza miembros y coconstruye obras y publicaciones.'],
    '加载更多邀请': ['加載更多邀請','Load more invites','もっと招待状を読み込む','더 많은 초대 로드','Cargar más invitaciones'],
    '告示牌内容': ['告示牌內容','Board content','掲示内容','게시판 내용','Contenido del tablón'],
    '回帖': ['回帖','Reply','返信','답글','Responder'],
    '撤销': ['撤銷','Undo','元に戻す','실행 취소','Deshacer'],
    '擦除作品': ['擦除作品','Erase work','作品を消去','작품 지우기','Borrar obra'],
    '待审核 / 已屏蔽帖子': ['待審核 / 已屏蔽帖子','Pending / Blocked posts','審査待ち/ブロック済み投稿','심사 대기/차단된 게시물','Pendientes / Bloqueadas'],
    '抽查为随机抽取，用于审核违规内容': ['抽查為隨機抽取，用於審核違規內容','Spot checks are random, for moderating violations','抽出はランダム、違反コンテンツの審査用','표본 검사는 무작위이며 위반 콘텐츠 심사용','Las revisiones son aleatorias, para moderar infracciones'],
    '拜拜了': ['拜拜了','Bye bye','さようなら','바이바이','Adiós'],
    '暂无可抽查帖子': ['暫無可抽查帖子','No posts for spot check','抽出可能な投稿はありません','표본 검사 가능한 게시물 없음','No hay publicaciones para revisar'],
    '暂无待审核帖子': ['暫無待審核帖子','No pending posts','審査待ちの投稿はありません','심사 대기 게시물 없음','No hay publicaciones pendientes'],
    '未读消息：': ['未讀消息：','Unread: ','未読メッセージ：','읽지 않은 메시지: ','Mensajes no leídos: '],
    '浏览': ['瀏覽','Views','閲覧','조회','Vistas'],
    '添加到共有作品': ['添加到共有作品','Add to shared works','共有作品に追加','공유 작품에 추가','Añadir a obras compartidas'],
    '移除': ['移除','Remove','削除','제거','Quitar'],
    '缩略图 URL（可选）': ['縮略圖 URL（可選）','Thumbnail URL (optional)','サムネイルURL（任意）','썸네일 URL(선택)','URL de miniatura (opcional)'],
    '获取Token': ['獲取Token','Get Token','トークンを取得','토큰 받기','Obtener Token'],
    '该作品类型（网页）已停用': ['該作品類型（網頁）已停用','This work type (web) is disabled','この作品タイプ(Web)は無効です','이 작품 유형(웹)은 중단되었습니다','Este tipo de obra (web) está deshabilitado'],
    '请从左侧选择一个文档查看': ['請從左側選擇一個文檔查看','Select a document on the left to view','左側からドキュメントを選択して表示','왼쪽에서 문서를 선택하여 보세요','Seleccione un documento a la izquierda'],
    '请选择分区': ['請選擇分區','Select a section','セクションを選択してください','구역을 선택하세요','Selecciona una sección'],
    '选择分区 *': ['選擇分區 *','Section *','セクション *','구역 *','Sección *'],
    '隶属团队：': ['隸屬團隊：','Team: ','所属チーム：','소속 팀: ','Equipo: '],
    '（团队暂未发布公告）': ['（團隊暫未發布公告）','(No announcements yet)','(まだ告知はありません)','(아직 공지사항이 없습니다)','(Aún no hay anuncios)'],
    '斜体': ['斜體','Italic','斜体','기울임꼴','Cursiva'],
    '共': ['共','Total: ','計','총','Total: '],
    '人': ['人',' members','人','명',' miembros'],
    '楼': ['樓','#','階','층','#'],
    '帖子内容 *（支持 Markdown）': ['帖子內容 *（支持 Markdown）','Content * (Markdown supported)','本文 *（Markdown対応）','내용 * (Markdown 지원)','Contenido * (compatible con Markdown)'],
    '帖子标题 *（80 字以内）': ['帖子標題 *（80 字以內）','Title * (within 80 characters)','タイトル *（80字以内）','제목 * (80자 이내)','Título * (máx. 80 caracteres)'],
    '头图 URL': ['頭圖 URL','Cover image URL','ヘッダー画像URL','커버 이미지 URL','URL de imagen de portada'],
    '作品文件：': ['作品文件：','Work file: ','作品ファイル：','작품 파일: ','Archivo de obra: '],
    '作品：': ['作品：','Work: ','作品：','작품: ','Obra: '],
    '多个标签用逗号分隔': ['多個標籤用逗號分隔','Separate tags with commas','タグはカンマで区切る','태그는 쉼표로 구분','Separa las etiquetas con comas'],
    '新密码（留空则不修改）': ['新密碼（留空則不修改）','New password (leave blank to keep)','新しいパスワード(空欄で変更なし)','새 비밀번호(비워두면 변경 안 함)','Nueva contraseña (vacío = sin cambios)'],
    '已关注': ['已關注','Following','フォロー中','팔로우 중','Siguiendo'],
    '已绑定 QQ：': ['已綁定 QQ：','QQ bound: ','バインド済みQQ：','연결된 QQ: ','QQ vinculado: '],
    'Markdown 语法说明：': ['Markdown 語法說明：','Markdown syntax guide:','Markdown構文ガイド：','Markdown 문법 안내:','Guía de sintaxis Markdown:'],

    '上一页': ['上一頁','Prev','前へ','이전','Anterior'],
    '下一页': ['下一頁','Next','次へ','다음','Siguiente'],
    '删除': ['刪除','Delete','削除','삭제','Eliminar'],
    '置顶': ['置頂','Pin','ピン留め','상단 고정','Fijar'],
    '取消置顶': ['取消置頂','Unpin','固定解除','고정 해제','Quitar fijado'],
    '发布': ['發布','Publish','投稿','게시','Publicar'],
    '返回论坛': ['返回論壇','Back to Forum','フォーラムへ','포럼으로','Volver al foro'],
    '返回作品池': ['返回作品池','Back to Works','作品プールへ','작품 풀로','Volver a obras'],
    '返回': ['返回','Back','戻る','돌아가기','Volver'],
    '用户名': ['用戶名','Username','ユーザー名','사용자명','Usuario'],
    '操作': ['操作','Actions','操作','작업','Acciones'],
    '密码': ['密碼','Password','パスワード','비밀번호','Contraseña'],
    '管理员': ['管理員','Admin','管理者','관리자','Administrador'],
    '作品': ['作品','Works','作品','작품','Obras'],
    '收藏': ['收藏','Favorite','お気に入り','즐겨찾기','Favorito'],
    '加载中...': ['載入中…','Loading…','読み込み中…','로딩 중…','Cargando…'],
    '加载中…': ['載入中…','Loading…','読み込み中…','로딩 중…','Cargando…'],
    '最热': ['最热','Hot','人気','인기','Popular'],
    '最新': ['最新','Latest','最新','최신','Recientes'],
    '最多赞': ['最多讚','Most Liked','いいね順','좋아요 순','Más gustados'],
    '最多藏': ['最多藏','Most Saved','保存順','저장 순','Más guardados'],
    '最多币': ['最多幣','Most Coins','コイン順','코인 순','Más monedas'],
    '最多评': ['最多評','Most Comments','コメント順','댓글 순','Más comentados'],
    '立即登录': ['立即登錄','Sign in now','今すぐログイン','지금 로그인','Iniciar sesión'],
    '查看作品': ['查看作品','View Work','作品を見る','작품 보기','Ver obra'],
    '论坛': ['論壇','Forum','フォーラム','포럼','Foro'],
    '举报': ['舉報','Report','通報','신고','Reportar'],
    '回复': ['回覆','Reply','返信','답글','Responder'],
    '登录': ['登錄','Sign in','ログイン','로그인','Iniciar sesión'],
    '查看': ['查看','View','見る','보기','Ver'],
    '随机抽查': ['隨機抽查','Random Check','ランダム確認','랜덤 검사','Comprobación aleatoria'],
    '刷新抽查': ['刷新抽查','Refresh','更新','새로 고침','Actualizar'],
    '添加': ['添加','Add','追加','추가','Añadir'],
    '发帖': ['發帖','New Post','投稿','글쓰기','Nueva publicación'],
    '图片': ['圖片','Image','画像','이미지','Imagen'],
    '团队名称': ['團隊名稱','Team Name','チーム名','팀 이름','Nombre del equipo'],
    '用户管理': ['用戶管理','User Management','ユーザー管理','사용자 관리','Gestión de usuarios'],
    '角色': ['角色','Role','ロール','역할','Rol'],
    '编辑': ['編輯','Edit','編集','수정','Editar'],
    '添加用户': ['添加用戶','Add User','ユーザー追加','사용자 추가','Añadir usuario'],
    '普通用户': ['普通用戶','User','一般ユーザー','일반 사용자','Usuario'],
    '开发者': ['開發者','Developer','開発者','개발자','Desarrollador'],
    '编辑用户': ['編輯用戶','Edit User','ユーザー編集','사용자 편집','Editar usuario'],
    '保存修改': ['保存修改','Save','保存','저장','Guardar'],
    '取消': ['取消','Cancel','キャンセル','취소','Cancelar'],
    '全部项目': ['全部項目','All Projects','全プロジェクト','전체 프로젝트','Todos los proyectos'],
    '优秀作品': ['優秀作品','Featured Works','優秀作品','우수 작품','Obras destacadas'],
    '查看更多': ['查看更多','View More','もっと見る','더 보기','Ver más'],
    '暂无作品': ['暫無作品','No works yet','作品なし','작품 없음','Sin obras'],
    '暂无通知': ['暫無通知','No notifications','通知なし','알림 없음','Sin notificaciones'],
    '暂无公告': ['暫無公告','No announcements','公告なし','공지 없음','Sin anuncios'],
    '通知': ['通知','Notifications','通知','알림','Notificaciones'],
    '全局公告': ['全局公告','Announcements','お知らせ','공지','Anuncios'],
    '全部已读': ['全部已讀','Mark all read','全て既読','모두 읽음','Marcar todo leído'],
    '删帖': ['刪帖','Delete','削除','삭제','Eliminar'],
    '暂无跟帖，来抢沙发！': ['暫無跟帖，來搶沙發！','No replies yet. Be the first!','返信なし。最初の一人に！','답글 없음. 첫 댓글을 달아보세요!','¡Sin respuestas aún!'],
    '后参与讨论': ['後參與討論',' to join the discussion','で参加','님 참여 가능',' para participar'],
    '后参与评论': ['後參與評論',' to comment','でコメント','님 댓글 가능',' para comentar'],
    'KE Hub 论坛': ['KE Hub 論壇','KE Hub Forum','KE Hub フォーラム','KE Hub 포럼','Foro KE Hub'],
    '暂时没有帖子，快去发布第一帖吧！': ['暫時沒有帖子，快去發布第一帖吧！','No posts yet. Create the first one!','投稿がありません。最初の投稿を！','작성된 글이 없습니다.','¡Sin publicaciones aún!'],
    '论坛广场': ['論壇廣場','Forums','フォーラム一覧','포럼 목록','Foros'],
    '暂无分区': ['暫無分區','No boards','掲示板なし','게시판 없음','Sin foros'],
    '发布帖子': ['發布帖子','New Post','投稿する','글 작성','Nueva publicación'],
    '发布': ['發布','Publish','投稿','게시','Publicar'],
    '通过': ['通過','Approve','承認','승인','Aprobar'],
    '屏蔽': ['屏蔽','Block','ブロック','차단','Bloquear'],
    '已屏蔽': ['已屏蔽','Blocked','ブロック済み','차단됨','Bloqueado'],
    '待审核': ['待審核','Pending','審査待ち','검토 대기','Pendiente'],
    '帖子举报': ['帖子舉報','Reports','通報','신고','Reportes'],
    '暂无举报': ['暫無舉報','No reports','通報なし','신고 없음','Sin reportes'],
    '板块管理': ['板塊管理','Boards','掲示板管理','게시판 관리','Gestión de foros'],
    '新增板块': ['新增板塊','New Board','掲示板追加','게시판 추가','Nuevo foro'],
    '板块名称': ['板塊名稱','Board Name','掲示板名','게시판 이름','Nombre del foro'],
    '排序': ['排序','Order','並び順','정렬','Orden'],
    '描述': ['描述','Description','説明','설명','Descripción'],
    '管理员发帖模式': ['管理員發帖模式','Admin-only posting','管理者のみ投稿','관리자만 게시','Solo administradores'],
    '板块列表': ['板塊列表','Board List','掲示板一覧','게시판 목록','Lista de foros'],
    '名称': ['名稱','Name','名前','이름','Nombre'],
    '权限': ['權限','Permission','権限','권한','Permiso'],
    '管理员专享': ['管理員專享','Admin only','管理者限定','관리자 전용','Solo admin'],
    '全员可发': ['全員可發','Everyone','全員投稿可','모두 게시 가능','Todos pueden'],
    '保存': ['保存','Save','保存','저장','Guardar'],
    '暂无板块。': ['暫無板塊。','No boards.','掲示板なし。','게시판 없음.','Sin foros.'],
    '本分区暂无帖子': ['本分區暫無帖子','No posts in this board','この掲示板に投稿なし','이 게시판에 글 없음','Sin publicaciones'],
    '发布新帖': ['發布新帖','New Thread','新規投稿','새 글','Nueva publicación'],
    '团队中心': ['團隊中心','Teams','チーム','팀 센터','Equipos'],
    '退出团队': ['退出團隊','Leave Team','チーム退出','팀 나가기','Salir del equipo'],
    '还没有加入任何团队': ['還沒有加入任何團隊','You have not joined a team','チーム未加入','팀에 가입하지 않음','Sin equipo'],
    '创建团队': ['創建團隊','Create Team','チーム作成','팀 만들기','Crear equipo'],
    '团队介绍': ['團隊介紹','Description','チーム紹介','팀 소개','Descripción'],
    '收到的团队邀请': ['收到的團隊邀請','Team Invites','チーム招待','팀 초대','Invitaciones'],
    '接受': ['接受','Accept','承認','수락','Aceptar'],
    '拒绝': ['拒絕','Decline','拒否','거절','Rechazar'],
    '登录后即可创建或加入团队': ['登錄後即可創建或加入團隊','Sign in to create or join a team','ログインすると作成/参加できます','로그인 후 생성 또는 참가','Inicia sesión para crear o unirte'],
    '帖子': ['帖子','Posts','投稿','글','Publicaciones'],
    '成员': ['成員','Members','メンバー','멤버','Miembros'],
    '邀请': ['邀請','Invites','招待','초대','Invitaciones'],
    '设置': ['設置','Settings','設定','설정','Ajustes'],
    '加载更多帖子': ['載入更多帖子','Load more posts','もっと見る','더 보기','Cargar más'],
    '加载更多成员': ['載入更多成員','Load more members','メンバーをもっと','멤버 더 보기','Cargar más'],
    '加载更多作品': ['載入更多作品','Load more works','作品をもっと','작품 더 보기','Cargar más'],
    '添加成员': ['添加成員','Add Member','メンバー追加','멤버 추가','Añadir miembro'],
    '成员用户名': ['成員用戶名','Member username','メンバー名','멤버 사용자명','Usuario del miembro'],
    '添加作品': ['添加作品','Add Work','作品追加','작품 추가','Añadir obra'],
    '发送邀请': ['發送邀請','Send Invite','招待送信','초대 보내기','Enviar invitación'],
    '待处理邀请': ['待處理邀請','Pending invites','保留中の招待','대기 중인 초대','Invitaciones pendientes'],
    '介绍': ['介紹','About','紹介','소개','Acerca de'],
    '保存设置': ['保存設置','Save Settings','設定保存','설정 저장','Guardar ajustes'],
    '删除团队': ['刪除團隊','Delete Team','チーム削除','팀 삭제','Eliminar equipo'],
    '全站作品数': ['全站作品數','Total Works','全作品数','전체 작품','Obras totales'],
    '待处理举报': ['待處理舉報','Pending Reports','通報保留','신고 대기','Reportes pendientes'],
    '隐藏作品': ['隱藏作品','Hide Work','作品非表示','작품 숨기기','Ocultar obra'],
    '暂无待处理举报': ['暫無待處理舉報','No pending reports','保留中の通報なし','대기 중인 신고 없음','Sin reportes'],
    '隐藏': ['隱藏','Hide','非表示','숨기기','Ocultar'],
    '发布作品': ['發布作品','Publish Work','作品公開','작품 게시','Publicar obra'],
    '作品标题 *': ['作品標題 *','Title *','タイトル *','제목 *','Título *'],
    '作品简介': ['作品簡介','Description','概要','설명','Descripción'],
    '标签': ['標籤','Tags','タグ','태그','Etiquetas'],
    '作品类型': ['作品類型','Type','タイプ','유형','Tipo'],
    '播放器（默认）': ['播放器（默認）','Player (default)','プレイヤー(既定)','플레이어(기본)','Reproductor (pred.)'],
    '重定向': ['重定向','Redirect','リダイレクト','리다이렉트','Redirección'],
    '我的作品': ['我的作品','My Works','マイ作品','내 작품','Mis obras'],
    '更新文件': ['更新文件','Update','更新','업데이트','Actualizar'],
    '擦除': ['擦除','Erase','消去','삭제','Borrar'],
    '你还没有发布任何作品': ['你還沒有發布任何作品','You have not published works','作品がありません','작품이 없습니다','Sin publicaciones'],
    '该作品暂无预览': ['該作品暫無預覽','No preview','プレビューなし','미리보기 없음','Sin vista previa'],
    '点赞': ['點讚','Like','いいね','좋아요','Me gusta'],
    '分享': ['分享','Share','共有','공유','Compartir'],
    '投币': ['投幣','Coin','コイン','코인','Moneda'],
    '在新窗口打开': ['在新窗口打開','Open in new window','新しい窓で開く','새 창에서 열기','Abrir en nueva ventana'],
    '暂无评论，快来抢沙发吧！': ['暫無評論，快來搶沙發！','No comments yet.','コメントなし。最初の一人に！','댓글이 없습니다.','¡Sin comentarios!'],
    '编辑资料': ['編輯資料','Edit Profile','プロフィール編集','프로필 편집','Editar perfil'],
    '粉丝': ['粉絲','Followers','フォロワー','팔로워','Seguidores'],
    '关注': ['關注','Following','フォロー','팔로잉','Siguiendo'],
    '留言': ['留言','Messages','メッセージ','메시지','Mensajes'],
    '最新发布': ['最新發布','Latest','最新投稿','최신','Recientes'],
    '筛选': ['篩選','Filter','絞り込み','필터','Filtrar'],
    '还没有发布作品': ['還沒有發布作品','No works published','作品未公開','작품 없음','Sin obras'],
    '还没有粉丝': ['還沒有粉絲','No followers','フォロワーなし','팔로워 없음','Sin seguidores'],
    '还没有关注任何人': ['還沒有關注任何人','Following nobody','フォローなし','팔로우 없음','Sin seguidos'],
    '还没有收藏任何作品': ['還沒有收藏任何作品','No favorites','お気に入りなし','즐겨찾기 없음','Sin favoritos'],
    '发布留言': ['發布留言','Send','送信','보내기','Enviar'],
    '登录后才能留言': ['登錄後才能留言','Sign in to message','ログイン後メッセージ可能','로그인 후 메시지','Inicia sesión'],
    '还没有留言，来说一句吧': ['還沒有留言，來說一句吧','No messages yet','メッセージなし','메시지 없음','Sin mensajes'],
    '用户注册': ['用戶註冊','Sign Up','新規登録','회원가입','Registrarse'],
    '确认密码': ['確認密碼','Confirm password','パスワード確認','비밀번호 확인','Confirmar contraseña'],
    '注册': ['註冊','Sign Up','登録','가입','Registrarse'],
    '已有账号？': ['已有賬號？','Have an account?','アカウントあり？','계정이 있으신가요?','¿Tienes cuenta?'],
    '确定': ['確定','OK','OK','확인','OK'],
    '下载': ['下載','Download','ダウンロード','다운로드','Descargar'],
    '在新标签页打开': ['在新標籤頁打開','Open in new tab','新しいタブで開く','새 탭에서 열기','Abrir en pestaña'],
    '文档目录': ['文檔目錄','Docs','ドキュメント','문서','Documentos'],
    '作品播放器正在加载，请稍后...': ['作品播放器正在載入，請稍後…','Loading player…','プレイヤー読み込み中…','플레이어 로딩 중…','Cargando reproductor…'],
    '作品加载中...': ['作品載入中…','Loading work…','作品読み込み中…','작품 로딩 중…','Cargando obra…'],
    '用户': ['用戶','User','ユーザー','사용자','Usuario'],
    '帖子（': ['帖子（','Posts (','投稿（','글（','Publicaciones (']
  };
  function curLang() {
    try { var l = localStorage.getItem('knexpanse-lang'); return LANGS.indexOf(l) >= 0 ? l : 'zh'; }
    catch (e) { return 'zh'; }
  }
  /* 原文缓存:翻译前记录中文原文,切回中文/切换语种时以原文为源 */
  var ORIG = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function translate(txt, lang) {
    var s = txt.trim();
    var e = D[s];
    if (!e) return null;
    var idx = LANGS.indexOf(lang) - 1;   /* zh 之外的语种索引 0..4 */
    if (idx < 0) return s === txt ? null : s;  /* 切回中文:还原为原文 */
    var v = e[idx];
    return v == null ? null : (txt.match(/^\s*/)[0] + v + txt.match(/\s*$/)[0]);
  }
  function walk(root, lang) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return NodeFilter.FILTER_REJECT;
        /* 导航栏由 nav.js/ke-nav.js 自行翻译,避免重复处理 */
        if (p.closest && p.closest('#hv2')) return NodeFilter.FILTER_REJECT;
        var src = (ORIG && ORIG.get(n)) || n.nodeValue;
        return /[\u4e00-\u9fff]/.test(src) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n, count = 0;
    while ((n = w.nextNode())) {
      if (n.nodeValue.indexOf('{%') >= 0 || n.nodeValue.indexOf('{{') >= 0) continue;
      var src = (ORIG && ORIG.get(n)) || n.nodeValue;
      var t = (lang === 'zh') ? src : translate(src, lang);
      if (t == null || t === n.nodeValue) continue;
      if (ORIG && src !== t) ORIG.set(n, src);
      n.nodeValue = t;
      if (++count > 600) break;
    }
  }
  function apply() {
    walk(document.body, curLang());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else { apply(); }
  /* 语言切换:storage 事件(跨标签页)+ 本页语言按钮点击(nav.js 写入 localStorage 后不刷新) */
  window.addEventListener('storage', function (e) { if (e.key === 'knexpanse-lang') apply(); });
  document.addEventListener('click', function (e) {
    var it = e.target && e.target.closest ? e.target.closest('.lang-item,.ke-lang-item') : null;
    if (!it) return;
    /* nav.js 的 click 处理器先写 localStorage;延迟一拍再翻译 */
    setTimeout(apply, 60);
    setTimeout(apply, 320);
  }, true);
  var t = null;
  var mo = new MutationObserver(function (muts) {
    /* 忽略纯文本翻译引起的变更(characterData 未监听),仅新节点插入时重扫 */
    clearTimeout(t);
    t = setTimeout(apply, 250);
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();

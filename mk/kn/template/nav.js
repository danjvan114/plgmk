/* ===== KN Expanse 共享导航组件 nav.js (自动从 index.html 提取) ===== */
(function(){
  var b64 = "PCEtLSDog4zmma/lhYnmlYggLS0+CjxkaXYgY2xhc3M9InRoZW1lLWZhZGUiIGlkPSJ0aGVtZUZhZGUiPjwvZGl2Pgo8ZGl2IGNsYXNzPSJidXJzdC1sYXllciIgaWQ9ImJ1cnN0TGF5ZXIiPjwvZGl2Pgo8ZGl2IGNsYXNzPSJjdXJzb3ItZ2xvdyIgaWQ9ImN1cnNvckdsb3ciPjwvZGl2Pgo8ZGl2IGNsYXNzPSJiZy1sYXllciIgaWQ9ImJnTGF5ZXIiPgogIDxkaXYgY2xhc3M9InBhcmFsbGF4IiBkYXRhLXNwZWVkPSIwLjA4Ij48ZGl2IGNsYXNzPSJiZy1vcmIgb3JiLTEiPjwvZGl2PjwvZGl2PgogIDxkaXYgY2xhc3M9InBhcmFsbGF4IiBkYXRhLXNwZWVkPSItMC4xNCI+PGRpdiBjbGFzcz0iYmctb3JiIG9yYi0yIj48L2Rpdj48L2Rpdj4KICA8ZGl2IGNsYXNzPSJwYXJhbGxheCIgZGF0YS1zcGVlZD0iMC4yIj48ZGl2IGNsYXNzPSJiZy1vcmIgb3JiLTMiPjwvZGl2PjwvZGl2Pgo8L2Rpdj4KCjwhLS0g5YWo5bGA57uf5LiA6aG25qCP5a+86IiqKOWGheW1jCzkuI3lho3kvp3otZYga25mLmpzIOazqOWFpSkgLS0+CjxkaXYgaWQ9Imh2MiI+CjxoZWFkZXIgaWQ9ImhlYWRlciI+CiAgPGRpdiBjbGFzcz0ibmF2LWxlZnQiPgogICAgPHNwYW4gY2xhc3M9Im1lbnUtdGl0bGUiIGlkPSJtZW51VGl0bGUiPjxzcGFuIGRhdGEtaTE4bj0ibWVudV90aXRsZSI+5a+86Iiq6I+c5Y2VPC9zcGFuPjwvc3Bhbj4KICAgIDxkaXYgY2xhc3M9ImxvZ28iPgogICAgICA8aW1nIGNsYXNzPSJsb2dvLWltZyB0aC1kZWYiIGlkPSJsb2dvSW1nIiBzcmM9Imh0dHBzOi8vaW1nLnJlbWl0LmVlL2FwaS9maWxlL0JRQUNBZ1VBQXlFR0FBU0hSc1BiQUFFWTZ2TnFlY0RsT3VVWC1sMkJFUms1YlB6aXlsTlNJQUFDd0NBQUFtc20wRmMtcWo5SzBwUDBMejBFLnBuZyIgYWx0PSJLTiBFeHBhbnNlIj4KICAgICAgPHNwYW4gZGF0YS1pMThuPSJuYXZfbWFya2V0Ij7mj5Lku7bluILlnLo8L3NwYW4+CiAgICA8L2Rpdj4KICAgIDxuYXYgY2xhc3M9Im5hdi1saW5rcyIgaWQ9Im5hdkxpbmtzIiBhcmlhLWxhYmVsPSLkuLvlr7zoiKoiPjwvbmF2PgogIDwvZGl2PgogIDxkaXYgY2xhc3M9Im5hdi1yaWdodCI+CiAgICA8YnV0dG9uIGNsYXNzPSJpY29uLWJ0biIgaWQ9Im1idG4iIGFyaWEtbGFiZWw9Iuenu+WKqOerr+S4i+i9vSIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxOSIgaGVpZ2h0PSIxOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjYiIHk9IjIuNSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjE5IiByeD0iMi41Ii8+PHBhdGggZD0iTTExIDE4LjVoMiIvPjwvc3ZnPjwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0iaWNvbi1idG4iIGlkPSJxcUJ0biIgYXJpYS1sYWJlbD0i5Yqg5YWlUVHnvqQiIHN0eWxlPSJkaXNwbGF5Om5vbmUiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTJhOCA4IDAgMCAxLTggOEg3bC00IDMgMS4zLTQuN0E4IDggMCAxIDEgMjEgMTJaIi8+PHBhdGggZD0iTTkgMTAuM2g2TTkgMTMuN2g0Ii8+PC9zdmc+PC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJpY29uLWJ0biIgaWQ9InFyQnRuIiBhcmlhLWxhYmVsPSLkuoznu7TnoIEiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTkiIGhlaWdodD0iMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iNyIgaGVpZ2h0PSI3IiByeD0iMS41Ii8+PHJlY3QgeD0iMTQiIHk9IjMiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIHJ4PSIxLjUiLz48cmVjdCB4PSIzIiB5PSIxNCIgd2lkdGg9IjciIGhlaWdodD0iNyIgcng9IjEuNSIvPjxwYXRoIGQ9Ik0xNCAxNGgzdjNoLTN6TTE4IDE4aDN2M2gtM3oiLz48L3N2Zz48L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9Imljb24tYnRuIiBpZD0ibGFuZ0J0biIgYXJpYS1sYWJlbD0i5YiH5o2i6K+t6KiAIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjE5IiBoZWlnaHQ9IjE5IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOC41Ii8+PHBhdGggZD0iTTMuNSAxMmgxN00xMiAzLjVjMi41IDIuNCAzLjggNS4yIDMuOCA4LjVzLTEuMyA2LjEtMy44IDguNWMtMi41LTIuNC0zLjgtNS4yLTMuOC04LjVzMS4zLTYuMSAzLjgtOC41WiIvPjwvc3ZnPjwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0iaWNvbi1idG4iIGlkPSJ0aGVtZUJ0biIgYXJpYS1sYWJlbD0i5YiH5o2i5Li76aKYIiB0aXRsZT0i5YiH5o2i5Li76aKYIj48c3ZnIGNsYXNzPSJpYy1zdW4iIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjE5IiBoZWlnaHQ9IjE5IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNC41Ii8+PHBhdGggZD0iTTEyIDJ2Mi41TTEyIDE5LjVWMjJNNC45IDQuOWwxLjggMS44TTE3LjMgMTcuM2wxLjggMS44TTIgMTJoMi41TTE5LjUgMTJIMjJNNC45IDE5LjFsMS44LTEuOE0xNy4zIDYuN2wxLjgtMS44Ii8+PC9zdmc+PHN2ZyBjbGFzcz0iaWMtbW9vbiIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTkiIGhlaWdodD0iMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgM2E5IDkgMCAxIDAgMCAxOGMxLjEgMCAyLS45IDItMiAwLS41LS4yLTEtLjUtMS4zLS40LS40LS41LS44LS41LTEuMiAwLS45LjctMS42IDEuNi0xLjZIMTZhNSA1IDAgMCAwIDUtNWMwLTMuOS00LTctOS03WiIvPjwvc3ZnPjwvYnV0dG9uPgogICAgPGJ1dHRvbiBjbGFzcz0iaWNvbi1idG4iIGlkPSJhZEF2YXRhckJ0biIgYXJpYS1sYWJlbD0i5Liq5Lq65Lit5b+DIiB0aXRsZT0i5Liq5Lq65Lit5b+DIiBzdHlsZT0ib3ZlcmZsb3c6aGlkZGVuO3BhZGRpbmc6MCI+CiAgICAgIDxzcGFuIGNsYXNzPSJhZC1hdmF0YXItZmIiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTkiIGhlaWdodD0iMTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjMuNSIvPjxwYXRoIGQ9Ik00LjUgMjBjLjgtMy41IDQtNSA3LjUtNXM2LjcgMS41IDcuNSA1Ii8+PC9zdmc+PC9zcGFuPgogICAgPC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJpY29uLWJ0biBoYW1idXJnZXIiIGlkPSJoYW1idXJnZXJCdG4iIGFyaWEtbGFiZWw9IuaJk+W8gOiPnOWNlSIgYXJpYS1leHBhbmRlZD0iZmFsc2UiPjxpPjwvaT48aT48L2k+PGk+PC9pPjwvYnV0dG9uPgogIDwvZGl2Pgo8L2hlYWRlcj4KPC9kaXY+CjxidXR0b24gaWQ9ImJhY2tUb3AiIGFyaWEtbGFiZWw9IuWbnuWIsOmhtumDqCI+CiAgPHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMTlWNSIvPjxwYXRoIGQ9Im02IDExIDYtNiA2IDYiLz48L3N2Zz4KPC9idXR0b24+CgogICAgPGRpdiBjbGFzcz0icXEtcG9wIiBpZD0icXFQb3AiPgogICAgICA8aW1nIHNyYz0iaHR0cHM6Ly9pbWcucmVtaXQuZWUvYXBpL2ZpbGUvQlFBQ0FnVUFBeUVHQUFTSFJzUGJBQUVZLW1KcWV6RVRFZGhtbk1vdWNFd2JpSXlqaFhtNGJnQUNlaW9BQW1zbTJGY0tEY2xJZUlvVnl6MEUucG5nIiBhbHQ9IktOIEV4cGFuc2UgUVHnvqQiPgogICAgICA8c3BhbiBkYXRhLWkxOG49InFxX3RpdGxlIj5LTiBFeHBhbnNlIOWumOaWueS6pOa1gee+pDwvc3Bhbj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ibS1wb3AiIGlkPSJtUG9wIj4KICAgICAgICA8c3BhbiBjbGFzcz0ibS1wb3AtdGl0bGUiIGRhdGEtaTE4bj0ibV90aXRsZSI+56e75Yqo56uv5LiL6L29PC9zcGFuPgogICAgICAgIDxpbWcgc3JjPSJodHRwczovL2ltZy5yZW1pdC5lZS9hcGkvZmlsZS9CUUFDQWdVQUF5RUdBQVNIUnNQYkFBRVpDZDFxZkVKekRGMHdKNnZWRmczV1FmLVFlUUlqTndBQ0N5TUFBa1dJNkZjQ0E2SHMxX3MxQ0QwRS5wbmciIGFsdD0i56e75Yqo56uv5LqM57u056CBIj4KICAgICAgICA8c21hbGwgZGF0YS1pMThuPSJtX25vdGUiPuenu+WKqOerr+S4i+i9vTwvc21hbGw+CiAgICAgIDwvZGl2Pgo8ZGl2IGNsYXNzPSJsYW5nLXBvcCIgaWQ9ImxhbmdQb3AiPgogICAgICAgIDxidXR0b24gY2xhc3M9ImxhbmctaXRlbSBjdXIiIGRhdGEtbGFuZz0iemgiPuS4reaWhzwvYnV0dG9uPgogICAgICAgIDxidXR0b24gY2xhc3M9ImxhbmctaXRlbSIgZGF0YS1sYW5nPSJ0dyI+57mB6auU5Lit5paHPHNwYW4gY2xhc3M9ImtlLWFpLWJhZGdlIj5BSTwvc3Bhbj48L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJsYW5nLWl0ZW0iIGRhdGEtbGFuZz0iZW4iPkVuZ2xpc2g8c3BhbiBjbGFzcz0ia2UtYWktYmFkZ2UiPkFJPC9zcGFuPjwvYnV0dG9uPgogICAgICAgIDxidXR0b24gY2xhc3M9ImxhbmctaXRlbSIgZGF0YS1sYW5nPSJqYSI+5pel5pys6KqePHNwYW4gY2xhc3M9ImtlLWFpLWJhZGdlIj5BSTwvc3Bhbj48L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJsYW5nLWl0ZW0iIGRhdGEtbGFuZz0ia28iPu2VnOq1reyWtDxzcGFuIGNsYXNzPSJrZS1haS1iYWRnZSI+QUk8L3NwYW4+PC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0ibGFuZy1pdGVtIiBkYXRhLWxhbmc9ImVzIj5Fc3Bhw7FvbDxzcGFuIGNsYXNzPSJrZS1haS1iYWRnZSI+QUk8L3NwYW4+PC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgPCEtLSDlpJbop4Lorr7nva7mgqzmta7nqpco57K+566A54mIOuWPquS/neeVmeS4u+mimOWIh+aNoizmsqHmnInlpJrkuLvpopjoj5zljZUpIC0tPgo8IS0tIOS6jOe7tOeggeaCrOa1rueqlyjnp7vliqjnq6/kuIvovb0gKyBRUSDnvqQpIC0tPgo8ZGl2IGNsYXNzPSJxci1wb3AiIGlkPSJxclBvcCI+CiAgPGRpdiBjbGFzcz0icXItdGFicyI+CiAgICA8YnV0dG9uIGNsYXNzPSJxci10YWIgYWN0aXZlIiBkYXRhLXE9Im0iPjxzcGFuIGRhdGEtaTE4bj0icXJfdGFiX20iPuenu+WKqOerr+S4i+i9vTwvc3Bhbj48L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9InFyLXRhYiIgZGF0YS1xPSJxIj48c3BhbiBkYXRhLWkxOG49InFyX3RhYl9xIj5RUSDnvqQ8L3NwYW4+PC9idXR0b24+CiAgPC9kaXY+CiAgPGRpdiBjbGFzcz0icXItaW1ncyIgaWQ9InFySW1ncyI+CiAgICA8ZGl2IGNsYXNzPSJxci1wYW5lIHNob3ciIGRhdGEtcT0ibSI+CiAgICAgIDxpbWcgaWQ9InFyTSIgc3JjPSJodHRwczovL2ltZy5yZW1pdC5lZS9hcGkvZmlsZS9CUUFDQWdVQUF5RUdBQVNIUnNQYkFBRVpDZDFxZkVKekRGMHdKNnZWRmczV1FmLVFlUUlqTndBQ0N5TUFBa1dJNkZjQ0E2SHMxX3MxQ0QwRS5wbmciIGFsdD0i56e75Yqo56uv5LiL6L29Ij4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0icXItcGFuZSIgZGF0YS1xPSJxIj4KICAgICAgPGltZyBpZD0icXJRIiBzcmM9Imh0dHBzOi8vaW1nLnJlbWl0LmVlL2FwaS9maWxlL0JRQUNBZ1VBQXlFR0FBU0hSc1BiQUFFWS1tSnFlekVURWRobW5Nb3VjRXdiaUl5amhYbTRiZ0FDZWlvQUFtc20yRmNLRGNsSWVJb1Z5ejBFLnBuZyIgYWx0PSJRUSDnvqQiPgogICAgICA8c3BhbiBjbGFzcz0icXItbmFtZSIgZGF0YS1pMThuPSJxcV90aXRsZSI+S04gRXhwYW5zZSDlrpjmlrnkuqTmtYHnvqQ8L3NwYW4+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC9kaXY+CjwhLS0g55So5oi35aS05YOPL+eZu+W9leW8ueeqlyjlr7zoiKrmoI/mnIDlj7Pkvqcs5LiO57yW6L6R5Zmo5LiL6L296aG15LiA6Ie0KSAtLT4KPGRpdiBjbGFzcz0ibG9vay1wb3AiIGlkPSJhZEF2YXRhclBvcCIgc3R5bGU9Im1pbi13aWR0aDoyMTRweCI+CiAgPHNwYW4gc3R5bGU9ImRpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOnZhcigtLXRleHQtMyk7cGFkZGluZzo0cHggMTJweCA2cHgiIGlkPSJhZEF2YXRhck5hbWUiPuS4quS6uuS4reW/gzwvc3Bhbj4KICA8YnV0dG9uIGNsYXNzPSJhZC1hdmF0YXItaXRlbSIgaWQ9ImFkQXZhdGFySG9tZSIgdHlwZT0iYnV0dG9uIiBvbmNsaWNrPSJsb2NhdGlvbi5ocmVmPScvdS9tZSciPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSIzLjUiLz48cGF0aCBkPSJNNC41IDIwYy44LTMuNSA0LTUgNy41LTVzNi43IDEuNSA3LjUgNSIvPjwvc3ZnPjxzcGFuPuaIkeeahOS4u+mhtTwvc3Bhbj48L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJhZC1hdmF0YXItaXRlbSIgdHlwZT0iYnV0dG9uIiBvbmNsaWNrPSJsb2NhdGlvbi5ocmVmPScvd29ya3Bvb2wvbXknIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzdjNNMTIgMTh2M00zIDEyaDNNMTggMTJoMyIvPjxyZWN0IHg9IjciIHk9IjciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcng9IjMiLz48L3N2Zz48c3Bhbj7miJHnmoTkvZzlk4E8L3NwYW4+PC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0iYWQtYXZhdGFyLWl0ZW0iIHR5cGU9ImJ1dHRvbiIgb25jbGljaz0ibG9jYXRpb24uaHJlZj0nL21lc3NhZ2VzJyI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTVhMiAyIDAgMCAxLTIgMkg3bC00IDRWNWEyIDIgMCAwIDEgMi0yaDE0YTIgMiAwIDAgMSAyIDJaIi8+PHBhdGggZD0iTTggOWg4TTggMTNoNSIvPjwvc3ZnPjxzcGFuPua2iOaBr+S4reW/gzwvc3Bhbj48L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJhZC1hdmF0YXItaXRlbSIgdHlwZT0iYnV0dG9uIiBvbmNsaWNrPSJsb2NhdGlvbi5ocmVmPScvY2hhbmdlX3Bhc3N3b3JkJyI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtOCA3LTUgNSA1IDVNMTYgN2w1IDUtNSA1TTEzIDRsLTIgMTYiLz48L3N2Zz48c3Bhbj7kv67mlLnlr4bnoIE8L3NwYW4+PC9idXR0b24+CiAgPGRpdiBjbGFzcz0ibG9vay1zZXAiPjwvZGl2PgogIDxidXR0b24gY2xhc3M9ImFkLWF2YXRhci1pdGVtIiB0eXBlPSJidXR0b24iIG9uY2xpY2s9ImxvY2F0aW9uLmhyZWY9Jy9sb2dvdXQnIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTE0IDYtNiA2IDYgNiIvPjwvc3ZnPjxzcGFuPumAgOWHuueZu+W9lTwvc3Bhbj48L2J1dHRvbj4KPC9kaXY+Cgo8IS0tIOWuieWNk+aJq+eggeS4i+i9veW8ueWxgiAtLT4KPGRpdiBjbGFzcz0icXItbW9kYWwiIGlkPSJxck1vZGFsIj4KICA8ZGl2IGNsYXNzPSJxci1tb2RhbC1ib3giPgogICAgPGltZyBzcmM9Imh0dHBzOi8vaW1nLnJlbWl0LmVlL2FwaS9maWxlL0JRQUNBZ1VBQXlFR0FBU0hSc1BiQUFFWkNkMXFmRUp6REYwd0o2dlZGZzNXUWYtUWVRSWpOd0FDQ3lNQUFrV0k2RmNDQTZIczFfczFDRDBFLnBuZyIgYWx0PSLlronljZPkuIvovb3kuoznu7TnoIEiPgogICAgPHAgZGF0YS1pMThuPSJxcl9zY2FuX3RpcCI+5omL5py65omr56CBLOeri+WNs+S4i+i9vSBLTiBFeHBhbnNlPC9wPgogICAgPGJ1dHRvbiBjbGFzcz0icXItbW9kYWwtY2xvc2UiIGlkPSJxck1vZGFsQ2xvc2UiPjxpIGNsYXNzPSJtZHVpLWljb24gbWF0ZXJpYWwtaWNvbnMiPmNsb3NlPC9pPuWFs+mXrTwvYnV0dG9uPgogIDwvZGl2Pgo8L2Rpdj4KCjwhLS0g56e75Yqo56uv5b+r5o235LiL6L296aaW5bGPIC0tPgo8ZGl2IGNsYXNzPSJtLWRsIiBpZD0ibURsIj4KICA8ZGl2IGNsYXNzPSJtLWRsLXRvb2xzIj4KICAgIDxidXR0b24gY2xhc3M9Im0tZGwtdG9vbCIgaWQ9Im1EbExhbmciIGFyaWEtbGFiZWw9IuWIh+aNouivreiogCI+PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS45IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjkiLz48cGF0aCBkPSJNMyAxMmgxOE0xMiAzYTE0IDE0IDAgMCAxIDAgMThNMTIgM2ExNCAxNCAwIDAgMCAwIDE4Ii8+PC9zdmc+PC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJtLWRsLXRvb2wiIGlkPSJtRGxMb29rIiBhcmlhLWxhYmVsPSLliIfmjaLlpJbop4IiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEiLz48L3N2Zz48L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9Im0tZGwtdG9vbCIgaWQ9Im1EbFFyIiBhcmlhLWxhYmVsPSJRUSDnvqTkuoznu7TnoIEiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iNyIgaGVpZ2h0PSI3IiByeD0iMS41Ii8+PHJlY3QgeD0iMTQiIHk9IjMiIHdpZHRoPSI3IiBoZWlnaHQ9IjciIHJ4PSIxLjUiLz48cmVjdCB4PSIzIiB5PSIxNCIgd2lkdGg9IjciIGhlaWdodD0iNyIgcng9IjEuNSIvPjxwYXRoIGQ9Ik0xNCAxNGgzdjNoLTN6TTIwIDE0aDFNMTQgMjBoMU0xNyAxN3Y0TTIxIDE3djEiLz48L3N2Zz48L2J1dHRvbj4KICA8L2Rpdj4KICA8ZGl2IGNsYXNzPSJtLWRsLWlubmVyIj4KICAgIDxpbWcgY2xhc3M9Im0tZGwtbG9nbyB0aC1kZWYiIHNyYz0iaHR0cHM6Ly9pbWcucmVtaXQuZWUvYXBpL2ZpbGUvQlFBQ0FnVUFBeUVHQUFTSFJzUGJBQUVZNnZOcWVjRGxPdVVYLWwyQkVSazViUHppeWxOU0lBQUN3Q0FBQW1zbTBGYy1xajlLMHBQMEx6MEUucG5nIiBhbHQ9IktOIEV4cGFuc2UiPjxoMSBjbGFzcz0ibS1kbC1oZXJvIj48c3BhbiBkYXRhLWkxOG49Imhlcm9fdDEiPueOsOS7o+WMluWbvuW9ouWMlue8lui+keWZqDwvc3Bhbj48YnI+PHNwYW4gY2xhc3M9Im0tZGwtZ3JhZCIgZGF0YS1pMThuPSJoZXJvX3QyIj7kuLrnlJ/mgIHogIznlJ88L3NwYW4+PHNwYW4gY2xhc3M9Im0tZGwtaGFuZCIgZGF0YS1pMThuPSJoZXJvX3QzIj5mb3IgY3JlYXRvcnM8L3NwYW4+PC9oMT4KICAgIDxhIGNsYXNzPSJtLWRsLWJ0biIgaWQ9Im1EbEFuZHJvaWQiIGhyZWY9Ii9sb2NhbGNkbi8yL2FwcC1kZWJ1Zy5hcGsiIHJlbD0ibm9vcGVuZXIiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA4aDEydjlhMiAyIDAgMCAxLTIgMkg4YTIgMiAwIDAgMS0yLTJaIi8+PHBhdGggZD0iTTkgOFY2YTMgMyAwIDAgMSA2IDB2MiIvPjxwYXRoIGQ9Ik0xMCAxM2guMDFNMTQgMTNoLjAxTTEwIDE3aDQiLz48L3N2Zz48c3BhbiBkYXRhLWkxOG49Im1fYW5kcm9pZCI+5a6J5Y2T5LiL6L29PC9zcGFuPjwvYT4KICAgIDxidXR0b24gY2xhc3M9Im0tZGwtYnRuIGlvcyIgaWQ9Im1EbElvcyIgdHlwZT0iYnV0dG9uIj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDMuNWMuNy0xIDItMS40IDMtMSAxIC41IDEuNSAxLjUgMS40IDIuNi0uOS40LTIgLjQtMyAuMy0uNS0uNy0uOS0xLjMtMS40LTEuOVoiLz48cGF0aCBkPSJNMTYuNSA4LjJjMS45IDIgMi44IDQuNSAyLjQgNy4xLS41IDMuMy0yLjggNS43LTYgNS43aC0xLjhjLTMuMiAwLTUuNS0yLjQtNi01LjctLjQtMi42LjUtNS4xIDIuNC03LjEuMy0uMy43LS40IDEuMS0uMy44LjIgMS42LjIgMi40IDAgLjktLjIgMS44LS4yIDIuNyAwIC44LjIgMS43LjIgMi40IDAgLjQtLjEuOCAwIDEuMS4zWiIvPjwvc3ZnPjxzcGFuIGRhdGEtaTE4bj0ibV9pb3MiPmlPUyDkuIvovb08L3NwYW4+PC9idXR0b24+CiAgICA8YnV0dG9uIGNsYXNzPSJtLWRsLWJ0biBnaG9zdCIgaWQ9Im1EbEVudGVyIiB0eXBlPSJidXR0b24iPjxzcGFuIGRhdGEtaTE4bj0ibV9kZXRhaWwiPuafpeeci+ivpue7huS7i+e7jTwvc3Bhbj48c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTkgNiA2IDYtNiA2Ii8+PC9zdmc+PC9idXR0b24+CiAgPC9kaXY+CjwvZGl2Pgo8IS0tIOenu+WKqOerrzrlm57liLDkuIvovb3pobXmjInpkq4o5Y+z5LiL6KeSKSAtLT4KPGJ1dHRvbiBjbGFzcz0ibS1iYWNrLWJ0biIgaWQ9Im1CYWNrQnRuIiBhcmlhLWxhYmVsPSLlm57liLDkuIvovb3pobUiPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA4aDEydjlhMiAyIDAgMCAxLTIgMkg4YTIgMiAwIDAgMS0yLTJaIi8+PHBhdGggZD0iTTkgOFY2YTMgMyAwIDAgMSA2IDB2MiIvPjxwYXRoIGQ9Ik0xMCAxM2guMDFNMTQgMTNoLjAxTTEwIDE3aDQiLz48L3N2Zz48c3BhbiBkYXRhLWkxOG49Im1fYmFjayI+5LiL6L29PC9zcGFuPjwvYnV0dG9uPg==";
  var bin = atob(b64); var bytes = Uint8Array.from(bin, function(c){return c.charCodeAt(0);});
  var nh = new TextDecoder("utf-8").decode(bytes);
  var w = document.createElement("div"); w.innerHTML = nh;
  document.body.insertBefore(w, document.body.firstChild);
})();

/* 背景图:与插件市场一致的 bg-photo(默认极光 + 暗夜),性能优先只保留背景图 */
(function () {
  if (document.getElementById('bgPhotoAurora')) return;
  var html = '<img class="bg-photo bg-photo-aurora" id="bgPhotoAurora" src="https://cdn-community.bcmcdn.com/47/community/gMFIRMdrgTad4kYb3b5qbhP9aOzG3lcqjbe5Uswbkm7S.jpg?hash=FnJp0oqklaTrfBqq5Y02yI040TQO" alt="插件市场背景">'
    + '<img class="bg-photo bg-photo-ocean" id="bgPhotoOcean" src="https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-blqex8C66nGonIanVXR7z_4TLD59gACtSkAAmsm2FenzP-p21Yj7z0E.jpg" alt="深海琉璃背景">'
    + '<img class="bg-photo bg-photo-amber" id="bgPhotoAmber" src="https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-Ztqex0lP1b1yTaPIQ3_HDbI9q4nJgACkykAAmsm2Ff0AAEoPnSg5Os9BA.jpg" alt="琥珀暮光背景">'
    + '<img class="bg-photo bg-photo-dark" id="bgPhotoDark" src="https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-bBqex51ZLwNxuT2IIs05FTlykLbJAACrCkAAmsm2FcLH3kvBfcaWz0E.jpg" alt="暗夜模式背景">';
  var t = document.createElement('div'); t.innerHTML = html;
  while (t.firstChild) document.body.insertBefore(t.firstChild, document.body.firstChild);
})();


(function(){
  var body = document.body;
  if (!document.getElementById('bgLayer')) {
    var bg = document.createElement('div'); bg.className='bg-layer'; bg.id='bgLayer';
    bg.innerHTML = '<div class="parallax" data-speed="0.08"><div class="bg-orb orb-1"></div></div>'
      + '<div class="parallax" data-speed="-0.14"><div class="bg-orb orb-2"></div></div>'
      + '<div class="parallax" data-speed="0.2"><div class="bg-orb orb-3"></div></div>';
    body.insertBefore(bg, body.firstChild);
  }
  if (!document.getElementById('cursorGlow')) {
    var g2 = document.createElement('div'); g2.className='cursor-glow'; g2.id='cursorGlow'; body.appendChild(g2);
  }
  if (!document.getElementById('particles')) {
    var pc = document.createElement('div'); pc.id='particles'; body.appendChild(pc);
    var COLORS=['#3b82f6','#38bdf8','#60a5fa','#22d3ee','#818cf8'];
    for (var i=0;i<26;i++){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width',(2+Math.random()*3).toFixed(1));s.setAttribute('height',(2+Math.random()*3).toFixed(1));s.style.position='absolute';s.style.left=(Math.random()*100).toFixed(2)+'%';s.style.top=(Math.random()*100).toFixed(2)+'%';s.style.opacity=(0.25+Math.random()*0.5).toFixed(2);if(Math.random()<0.4)s.classList.add('glow');var p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d','M12 2l2.4 6.8L21 11l-6.6 2.2L12 20l-2.4-6.8L3 11l6.6-2.2z');p.setAttribute('fill',COLORS[i%COLORS.length]);s.appendChild(p);pc.appendChild(s);}
  }
  if (!window.__NAV_MOVE__) {
    window.__NAV_MOVE__ = 1;
    document.addEventListener('mousemove', function(e){ var g=document.getElementById('cursorGlow'); if(g){g.style.left=e.clientX+'px'; g.style.top=e.clientY+'px';} });
  }
})();


/* ===== 全站主题脚本(内嵌自包含,不依赖外部 theme.js) ===== */
/* ============================================================
   KN Expanse 全站统一主题脚本 theme.js
   双主题(极光紫霞白天/暗夜黑夜) · localStorage 实时同步
   主题/节能按钮事件委托 · 节能模式 · 移动端检测
   所有页面共用此脚本,不依赖页面内嵌逻辑
   ============================================================ */
(function () {
  'use strict';

  var KEY_THEME = 'knexpanse-theme';

  function read(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  /* 当前是否暗夜:3 或 dark(兼容旧数据) */
  function curIsDark() {
    var t = read(KEY_THEME);
    return t === '3' || t === 'dark';
  }

  function isToolPage(body) {
    return body.classList.contains('theme-light') || body.classList.contains('theme-dark');
  }
  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MQQBrowser/i.test(navigator.userAgent);
  }

  /* 应用主题到 body,并同步按钮状态 */
  function apply() {
    var body = document.body;
    if (!body) return;
    var dark = curIsDark();
    body.classList.remove('theme-aurora', 'theme-ocean', 'theme-amber', 'dark-mode', 'theme-light', 'theme-dark');
    if (isToolPage(body)) {
      body.classList.add(dark ? 'theme-dark' : 'theme-light');
    } else {
      body.classList.add(dark ? 'dark-mode' : 'theme-aurora');
    }
    body.classList.toggle('mobile', isMobile());
    syncBtns(body, dark);
    /* 同步主题菜单勾选(双主题:0=白天 / 3=黑夜) */
    var tps = document.querySelectorAll('.tp-item');
    for (var ti = 0; ti < tps.length; ti++) {
      tps[ti].classList.toggle('cur', tps[ti].getAttribute('data-i') === (dark ? '3' : '0'));
    }
  }

  /* 主题按钮高亮同步 */
  function syncBtns(body, dark) {
    var tb = document.getElementById('themeBtn');
    if (tb) {
      tb.classList.toggle('dark', dark);
      tb.setAttribute('title', dark ? '切换到白天' : '切换到黑夜');
    }
  }

  /* 切换主题(白天<->黑夜) */
  function toggleTheme() {
    var dark = curIsDark();
    write(KEY_THEME, dark ? '0' : '3');
    apply();
  }

  /* 初始化 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  /* 多页面主题实时同步:其他页面修改主题时本页即时跟随 */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY_THEME) apply();
  });

  /* 按钮事件委托(全站统一):不依赖页面内嵌逻辑 */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('#themeBtn');
    if (t) {
      /* 重置版:仅双主题(白天/黑夜),点击直接切换 */
      toggleTheme();
      return;
    }
  });
})();


  var RUN_ENV = 'CDN';
  try { if (window.location && window.location.protocol === 'file:') RUN_ENV = 'LOCAL'; } catch (e) {}
  try { document.documentElement.setAttribute('data-env', RUN_ENV); } catch (e) {}


(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };

  /* ========== 统一 JS 顶栏 ========== */
  function buildNavLinks(currentPage) {
    var navSvg = {
      home: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
      discover: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/></svg>',
      team: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
      forum: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.3-4.7A8 8 0 1 1 21 12Z"/></svg>',
      plugin: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3l3-3 3 3h7v4l3 3-3 3v4h-7l-3 3-3-3H4v-4L1 11l3-3Z"/><circle cx="8.5" cy="11" r="1.4" fill="currentColor" stroke="none"/><circle cx="12.5" cy="15" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8" r="1.4" fill="currentColor" stroke="none"/></svg>',
      editor: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg>',
      dev: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>',
      work: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
    };
    var extBase = '';
    var items = [
      { key:'home',    href:extBase+'/',              i18n:'nav_home',    label:'首页' },
      { key:'discover',href:extBase+'/workpool',      i18n:'nav_discover',label:'发现' },
      { key:'team',    href:extBase+'/team',           i18n:'nav_team',    label:'工作室' },
      { key:'forum',   href:extBase+'/forum',          i18n:'nav_forum',   label:'论坛' },
      { key:'plugin',  href:'插件市场.html',            i18n:'nav_plugin',  label:'插件' },
      { key:'editor',  href:'编辑器下载.html',          i18n:'nav_editor',  label:'编辑器下载' }
    ];
    var moreItems = [
      { key:'dev',  href:extBase+'/dev/kn',      i18n:'mk_dev',       label:'开发者中心' },
      { key:'work', href:extBase+'/workbench',    i18n:'nav_workspace', label:'工作台' }
    ];
    var navLinks = $('#navLinks');
    if (!navLinks) return;
    var html = '';
    items.forEach(function (it) {
      var cls = it.key === currentPage ? ' class="active"' : '';
      var tgt = it.key === currentPage ? '' : ' target="_blank" rel="noopener"';
      if (it.key === currentPage) { tgt = ''; }
      html += '<a href="' + it.href + '"' + cls + tgt + '>' + navSvg[it.key] + '<span data-i18n="' + it.i18n + '">' + it.label + '</span></a>';
    });
    html += '<div class="nav-more-wrap">' +
      '<button class="nav-more-btn" id="navMoreBtn" aria-haspopup="true" aria-expanded="false"><span data-i18n="nav_more">更多</span><svg class="nav-more-caret" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '<div class="nav-more-menu" id="navMoreMenu">';
    moreItems.forEach(function (it) {
      html += '<a href="' + it.href + '" target="_blank" rel="noopener">' + navSvg[it.key] + '<span data-i18n="' + it.i18n + '">' + it.label + '</span></a>';
    });
    html += '</div></div>';
    navLinks.innerHTML = html;
    /* logo 文字也更新 */
    var logoText = currentPage === 'plugin' ? '插件市场' : '编辑器下载';
    var logoI18n = currentPage === 'plugin' ? 'nav_market' : 'nav_editor';
    var logoSpan = $('.logo span[data-i18n]');
    if (logoSpan) { logoSpan.textContent = logoText; logoSpan.setAttribute('data-i18n', logoI18n); }
  }

  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* 强制开启性能模式:始终全特效运行,节能/轻量模式已移除 */
  /* ---------- 主题专属资源 ---------- */
  var LOGO_DEFAULT = 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY6vNqecDlOuUX-l2BERk5bPziylNSIAACwCAAAmsm0Fc-qj9K0pP0Lz0E.png';
  var ASSETS = {
    ocean: {
      logo: 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-bxqex-f48DQB9KHbT3TmnzNbl3KkgACuSkAAmsm2FdW3ccZ-jHpOz0E.png',
      term: 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-btqex9uP0t1sJIePCyRgejEZyY-CwACuCkAAmsm2FdierBKhSg5SD0E.png'
    },
    amber: {
      logo: 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-a1qex5VEVbErertv1lJE8qisUClCQACqSkAAmsm2Fcb-FJiIZXGQz0E.png',
      term: 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-aVqex2-qT9U9N0WXwYbWtRIiTqZ8QACnSkAAmsm2Fec5-j2b9AlCz0E.png'
    }
  };

  /* ---------- 图片降级 ---------- */
  function setupImgFallback(imgId, fallbackId, fbDisplay) {
    var img = document.getElementById(imgId);
    var fb = document.getElementById(fallbackId);
    if (!img) return;
    function failed() { img.style.display = 'none'; if (fb) { fb.classList.add('show'); fb.style.display = fbDisplay || 'flex'; } }
    img.addEventListener('error', failed);
    if (img.complete && img.naturalWidth === 0) { failed(); }
  }
  setupImgFallback('logoImg', 'logoMark', 'flex');
  setupImgFallback('footerLogo', 'footerMark', 'inline-flex');
  setupImgFallback('titleLogoImg');
  setupImgFallback('bgPhotoOcean');
  setupImgFallback('bgPhotoAmber');
  setupImgFallback('bgPhotoDark');
  /* 主题专属图:CSS 按主题显示;加载失败则隐藏自身 */
  $$('.th-ocean, .th-amber, .term-img').forEach(function (img) {
    img.addEventListener('error', function () { this.style.display = 'none'; });
  });
  /* 终端两张图都失败时降级为自绘 SVG */
  var termImgs = $$('.term-img');
  var termFallback = $('#termFallback');
  termImgs.forEach(function (img) {
    img.addEventListener('error', function () {
      if (termImgs.every(function (x) { return x.style.display === 'none'; })) termFallback.classList.add('show');
    });
  });

  /* ---------- 主题切换:高模糊遮罩 + 大 logo ---------- */
  function themeTransition(targetLogo) {
    var layer = $('#burstLayer');
    layer.innerHTML = '';
    /* 高模糊遮罩 */
    var veil = document.createElement('div');
    veil.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,.05);backdrop-filter:blur(28px) saturate(140%);-webkit-backdrop-filter:blur(28px) saturate(140%);box-shadow:inset 0 0 120px rgba(0,0,0,.28);opacity:0;transition:opacity .55s ease;z-index:1;';
    layer.appendChild(veil);
    /* 中央容器(绝对居中) */
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2;';
    layer.appendChild(wrap);
    var logo = document.createElement('img');
    logo.src = targetLogo || LOGO_DEFAULT;
    logo.style.cssText = 'width:104px;height:104px;object-fit:contain;transform:scale(.2) rotate(-35deg);opacity:0;transition:transform .8s cubic-bezier(.34,1.56,.64,1),opacity .3s;filter:drop-shadow(0 0 30px var(--accent-glow));z-index:2;';
    wrap.appendChild(logo);
    /* 圆形波形光环 */
    var ring = document.createElement('span');
    ring.style.cssText = 'position:absolute;left:50%;top:50%;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;border:1.5px solid var(--accent-1);box-shadow:0 0 44px var(--accent-glow),inset 0 0 30px var(--accent-glow);transform:scale(.3);opacity:0;transition:all .9s cubic-bezier(.22,.61,.36,1);z-index:1;';
    layer.appendChild(ring);
    requestAnimationFrame(function () { veil.style.opacity = '1'; });
    setTimeout(function () {
      logo.style.transform = 'scale(1) rotate(0)';
      logo.style.opacity = '1';
      ring.style.transform = 'scale(1)';
      ring.style.opacity = '.9';
    }, 80);
    setTimeout(function () {
      logo.style.transform = 'scale(2.2) rotate(12deg)';
      logo.style.opacity = '0';
      ring.style.transform = 'scale(1.9)';
      ring.style.opacity = '0';
      veil.style.opacity = '0';
    }, 1000);
    setTimeout(function () { layer.innerHTML = ''; }, 1700);
  }

  /* ---------- 主题 ---------- */
  var THEMES = [
    { cls: 'theme-aurora', name: '极光紫霞', icon: 'circles', anim: 'drift',   logo: LOGO_DEFAULT, term: ASSETS.ocean.term },
    { cls: 'theme-ocean',  name: '深海琉璃', icon: 'gem',     anim: 'drift',   logo: ASSETS.ocean.logo, term: ASSETS.ocean.term },
    { cls: 'theme-amber',  name: '琥珀暮光', icon: 'leaf',    anim: 'drift',   logo: ASSETS.amber.logo, term: ASSETS.amber.term },
    { cls: 'dark-mode',    name: '暗夜模式', icon: 'star4',   anim: 'twinkle', logo: LOGO_DEFAULT, term: ASSETS.amber.term }
  ];
  var THEME_ICON = {
    circles: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
    gem:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 3h10l5 7-10 11L2 10Z"/><path d="M2 10h20M7 3l5 7 5-7M12 10v11" stroke="rgba(255,255,255,.4)" stroke-width="1.1" fill="none" stroke-linejoin="round"/></svg>',
    leaf:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3C18 5 20 12 16 19 9 18 5 11 7 4 9 3 11 3 12 3Z"/><path d="M12 3c0 6 0 11-2 16" stroke="rgba(255,255,255,.4)" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>',
    star4:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.5 14.2 9.8 21.5 12l-7.3 2.2L12 21.5 9.8 14.2 2.5 12l7.3-2.2Z"/></svg>'
  };
  var savedIdx = parseInt(localStorage.getItem('knexpanse-theme'), 10);
  var curIdx = isNaN(savedIdx) ? 0 : Math.max(0, Math.min(THEMES.length - 1, savedIdx));
  if (curIdx === 1 || curIdx === 2) curIdx = 0; /* 仅两套主题:1/2 归并到白天 */
  var themeFade = $('#themeFade');
  var themePop = $('#themePop');
  var themeToggle = $('#themeToggle');

  function applyTheme(i) {
    if (typeof i === 'number') curIdx = i;
    document.body.classList.remove('theme-aurora', 'theme-ocean', 'theme-amber', 'dark-mode');
    var t = THEMES[curIdx];
    if (t.cls) document.body.classList.add(t.cls);
    /* 悬浮窗勾选标记优先同步(logo/终端图由 CSS 按主题驱动,不依赖 JS) */
    $$('.tp-item').forEach(function (it) { it.classList.toggle('cur', parseInt(it.dataset.i, 10) === curIdx); });
    try { localStorage.setItem('knexpanse-theme', String(curIdx)); } catch (e) {}
  }

  /* 双主题同步已由 #themeBtn 系统统一处理;移除旧三主题 storage 监听,避免两套主题打架导致反复切换 */

  var popTimer = null;
  /* 悬浮窗打开期间锁定导航栏按钮:鼠标从悬浮窗移出扫过任何按钮都不会误触 */
  var unlockBtnId = null;
  function anyPopOpen() {
    return !!document.querySelector('.theme-pop.show,.qq-pop.show,.m-pop.show,.lang-pop.show,.look-pop.show,.qr-pop.show');
  }
  /* 悬浮窗互斥守卫:其它悬浮窗打开期间,本悬浮窗的打开请求直接忽略(鼠标扫过不切换) */
  function otherPopOpen(exceptSel) {
    var sels = ['.theme-pop.show','.qq-pop.show','.m-pop.show','.lang-pop.show','.look-pop.show','.qr-pop.show'];
    if (exceptSel) sels = sels.filter(function (s) { return s !== exceptSel; });
    return !!document.querySelector(sels.join(','));
  }
  function syncNavLock() {
    if (isMobileUA) return;
    var locked = anyPopOpen();
    ['qrBtn','lookBtn','langBtn','themeToggle','qqBtn','mbtn'].forEach(function (id) {
      var b = document.getElementById(id);
      /* 当前打开的悬浮窗对应按钮免锁,否则 pointer-events 切换会触发 mouseleave 循环抽搐 */
      if (b) b.style.pointerEvents = (locked && id !== unlockBtnId) ? 'none' : '';
    });
  }
  function posPop(pop, btn) {
    if (!pop || !btn) return;
    var r = btn.getBoundingClientRect();
    var pw = pop.offsetWidth || 220;
    /* 悬浮窗在按钮正下方(右缘对齐),避免溢出屏幕左侧 */
    var left = r.right - pw;
    if (left < 10) left = 10;
    pop.style.left = left + 'px';
    pop.style.top = (r.bottom + 12) + 'px';
    pop.style.right = 'auto';
  }
  /* pop-open 已弃用(更多菜单已移除),保留空实现兼容旧调用 */
  function syncPopOpen() { if (header) header.classList.remove('pop-open'); }
  function showPop() { if (!isMobileUA && otherPopOpen('.theme-pop.show')) return; clearTimeout(popTimer); qqPop.classList.remove('show'); clearTimeout(qqTimer); mPop.classList.remove('show'); clearTimeout(mTimer); langPop.classList.remove('show'); clearTimeout(langTimer); posPop(themePop, themeToggle); themePop.classList.add('show'); unlockBtnId = 'themeToggle'; syncNavLock(); }
  function hidePop() { popTimer = setTimeout(function () { themePop.classList.remove('show'); unlockBtnId = null; syncPopOpen(); syncNavLock(); }, 250); }
  /* 按钮悬停 200ms 才打开悬浮窗:鼠标扫过相邻按钮不误触 */
  var themeOpenT = null;
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      curIdx = (curIdx === 0) ? 3 : 0;
      applyTheme();
      try { closeAllPops(); } catch (e) {}
    });
  }
  /* 悬浮窗禁用:改为点击直接切换 */
  if (typeof themePop === 'object' && themePop) { themePop.classList.remove('show'); }
  if (themePop) {
    themePop.addEventListener('mouseenter', showPop);
    themePop.addEventListener('mouseleave', hidePop);
  }
  /* QQ 群悬浮窗 */
  var qqBtn = $('#qqBtn');
  var qqPop = $('#qqPop');
  var qqTimer = null;
  function showQq() { if (!isMobileUA && otherPopOpen('.qq-pop.show')) return; clearTimeout(qqTimer); if(themePop) themePop.classList.remove('show'); clearTimeout(popTimer); if(mPop) mPop.classList.remove('show'); clearTimeout(mTimer); if(langPop) langPop.classList.remove('show'); clearTimeout(langTimer); if(qqPop && qqBtn) posPop(qqPop, qqBtn); if(qqPop) qqPop.classList.add('show'); unlockBtnId = 'qqBtn'; syncNavLock(); }
  function hideQq() { qqTimer = setTimeout(function () { if(qqPop) qqPop.classList.remove('show'); unlockBtnId = null; syncPopOpen(); syncNavLock(); }, 250); }
  if (qqBtn && qqPop) {
    var qqOpenT = null;
    qqBtn.addEventListener('mouseenter', function () { if (!hoverPop) return; clearTimeout(qqOpenT); qqOpenT = setTimeout(showQq, 300); });
    qqBtn.addEventListener('mouseleave', function () { if (!hoverPop) return; clearTimeout(qqOpenT); hideQq(); });
    qqPop.addEventListener('mouseenter', showQq);
    qqPop.addEventListener('mouseleave', hideQq);
  }
  $$('.tp-item').forEach(function (it) {
    it.addEventListener('click', function () {
      var i = parseInt(it.dataset.i, 10);
      if (i === curIdx) { themePop.classList.remove('show'); unlockBtnId = null; syncNavLock(); return; }
      /* 先收 QQ 悬浮窗,再切换主题 */
      qqPop.classList.remove('show'); clearTimeout(qqTimer);
      /* 立即同步主题,再播动画(动画使用目标主题的 logo) */
      themeFade.style.opacity = '.5';
      applyTheme(i);
      themeTransition(THEMES[i].logo);
      setTimeout(function () { themeFade.style.opacity = '0'; }, 340);
      themePop.classList.remove('show');
      unlockBtnId = null;
      syncNavLock();
    });
  });


  /* ---------- 导航 ---------- */
  var header = $('#header');
  var hamburger = $('#hamburgerBtn');
  $$('a[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      closeMenu();
    });
  });
  function closeMenu() {
    if (!header || !header.classList.contains('menu-open')) return;
    header.classList.add('closing');
    header.style.height = '60px';
    setTimeout(function () {
      header.classList.remove('menu-open');
      header.classList.remove('closing');
      header.style.height = '';
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      header.classList.add('nav-reveal');
      setTimeout(function () { header.classList.remove('nav-reveal'); }, 620);
    }, 460);
  }
  if (hamburger) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (header.classList.contains('menu-open')) { closeMenu(); return; }
      /* 打开菜单前收起已开悬浮窗,避免并存 */
      if (isMobileUA) { if(qrPop) qrPop.classList.remove('show'); if(lookPop) lookPop.classList.remove('show'); if(langPop) langPop.classList.remove('show'); }
      header.classList.add('hiding-nav');
      setTimeout(function () {
        header.classList.remove('hiding-nav');
        header.classList.add('menu-open');
        hamburger.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            header.style.height = header.scrollHeight + 'px';
          });
        });
      }, 220);
    });
  }
  document.addEventListener('click', function (e) { if (header && header.classList.contains('menu-open') && !e.target.closest('header, .theme-pop, .qq-pop, .m-pop, .lang-pop, .look-pop, .qr-pop')) closeMenu(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1040 && header) { header.style.height = ''; closeMenu(); } });

  /* ---------- 导航"更多"收纳菜单(hover 展开,点击也可) ---------- */
  buildNavLinks(document.body.getAttribute('data-page')||'plugin');
  var navMoreBtn = $('#navMoreBtn');
  var navMoreMenu = $('#navMoreMenu');
  var navMoreWrap = $('.nav-more-wrap');
  var navMoreT = null;
  var navMoreT2 = null;
  /* 桌面端:菜单挂到 body 层并固定定位,避免被 header 的 overflow/backdrop-filter 裁剪;
     移动端(≤1040px):移回 .nav-more-wrap 内,作为静态网格项展开 */
  function layoutNavMore() {
    if (!navMoreMenu || !navMoreWrap) return;
    var mobile = window.innerWidth <= 1040;
    var inBody = navMoreMenu.parentNode === document.body;
    if (mobile && inBody) { navMoreWrap.appendChild(navMoreMenu); }
    if (!mobile && !inBody) { document.body.appendChild(navMoreMenu); }
    if (!mobile && navMoreMenu.classList.contains('show')) posNavMore();
  }
  function posNavMore() {
    if (!navMoreMenu || !navMoreBtn) return;
    var r = navMoreBtn.getBoundingClientRect();
    navMoreMenu.style.top = (r.bottom + 10) + 'px';
    navMoreMenu.style.right = (Math.max(0, window.innerWidth - r.right)) + 'px';
    navMoreMenu.style.left = 'auto';
  }
  function openNavMore() {
    if (!navMoreMenu) return;
    clearTimeout(navMoreT);
    clearTimeout(navMoreT2);
    posNavMore();
    navMoreMenu.classList.add('show');
    if (navMoreBtn) navMoreBtn.setAttribute('aria-expanded', 'true');
  }
  function closeNavMore() {
    if (!navMoreMenu) return;
    navMoreT = setTimeout(function () {
      navMoreMenu.classList.remove('show');
      if (navMoreBtn) navMoreBtn.setAttribute('aria-expanded', 'false');
    }, 200);
  }
  if (navMoreWrap) {
    navMoreWrap.addEventListener('mouseenter', function () { clearTimeout(navMoreT); clearTimeout(navMoreT2); openNavMore(); });
    navMoreWrap.addEventListener('mouseleave', closeNavMore);
  }
  /* 菜单挂到 body 后不再是 wrap 子元素,需单独监听菜单自身的进出,悬停期间不关闭 */
  if (navMoreMenu) {
    navMoreMenu.addEventListener('mouseenter', function () { clearTimeout(navMoreT); clearTimeout(navMoreT2); openNavMore(); });
    navMoreMenu.addEventListener('mouseleave', closeNavMore);
  }
  if (navMoreBtn) {
    navMoreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (navMoreMenu && navMoreMenu.classList.contains('show')) closeNavMore();
      else openNavMore();
    });
  }
  document.addEventListener('click', function (e) {
    if (navMoreMenu && navMoreMenu.classList.contains('show') &&
        !e.target.closest('.nav-more-wrap') && !e.target.closest('#navMoreMenu')) {
      clearTimeout(navMoreT);
      navMoreMenu.classList.remove('show');
      if (navMoreBtn) navMoreBtn.setAttribute('aria-expanded', 'false');
    }
  });
  layoutNavMore();
  window.addEventListener('resize', layoutNavMore);

  var backTop = $('#backTop');
  window.addEventListener('scroll', function () {
    if (header) header.classList.toggle('scrolled', window.scrollY > 30);
    if (backTop) backTop.classList.toggle('show', window.scrollY > 520);
  }, { passive: true });
  if (backTop) backTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- 移动端下载按钮 + 悬浮窗(与其余悬浮窗互斥) ---------- */
  var mbtn = $('#mbtn');
  var mPop = $('#mPop');
  var mTimer = null;
  function showMPop() {
    if (!isMobileUA && otherPopOpen('.m-pop.show')) return;
    clearTimeout(mTimer);
    if(themePop) themePop.classList.remove('show'); clearTimeout(popTimer);
    if(qqPop) qqPop.classList.remove('show'); clearTimeout(qqTimer);
    if(mPop && mbtn) posPop(mPop, mbtn); if(mPop) mPop.classList.add('show'); unlockBtnId = 'mbtn'; syncNavLock();
  }
  function hideMPop() { mTimer = setTimeout(function () { if(mPop) mPop.classList.remove('show'); unlockBtnId = null; syncPopOpen(); syncNavLock(); }, 250); }
  if (mbtn && mPop) {
    var mOpenT = null;
    mbtn.addEventListener('mouseenter', function () { if (!hoverPop) return; clearTimeout(mOpenT); mOpenT = setTimeout(showMPop, 300); });
    mbtn.addEventListener('mouseleave', function () { if (!hoverPop) return; clearTimeout(mOpenT); hideMPop(); });
    mPop.addEventListener('mouseenter', showMPop);
    mPop.addEventListener('mouseleave', hideMPop);
  }

  /* ---------- 移动端快捷下载首屏 ---------- */
  var mDl = $('#mDl');
  var isMobileUA = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MQQBrowser/i.test(navigator.userAgent);
  function mDlOpen() {
    if (!mDl) return;
    mDl.classList.add('show');
    document.body.style.overflow = 'hidden';
    /* 折叠屏/节能:起始页只保留自身,主内容先不渲染,点"查看详细介绍"再加载 */
    document.body.classList.add('m-boot');
    window.scrollTo(0, 0);
    mDl.scrollTop = 0;
  }
  function mDlOff() {
    if (!mDl) return;
    mDl.classList.remove('show');
    document.body.style.overflow = '';
    document.body.classList.remove('m-boot');
    /* 查看详细介绍:直接进主页(不刷新,否则会弹回起始页) */
    window.scrollTo(0, 0);
  }
  if (isMobileUA) {
    document.body.classList.add('mobile');
    /* 插件页:移动端直接进入插件列表,不自动弹出下载首屏 */
  }
  /* 移动端:悬浮窗改点击交互,禁用 hover 打开 */
  var hoverPop = !isMobileUA;
  /* 查看详细介绍:进入主页 */
  if ($('#mDlEnter')) $('#mDlEnter').addEventListener('click', mDlOff);
  if ($('#mDlIos')) $('#mDlIos').addEventListener('click', function () { toast(I18N.dl_ios_tip ? I18N.dl_ios_tip[curLang] : 'iOS 版正在研发中,敬请期待'); });
  /* 插件页不显示"回到下载页"按钮(下载首屏仅移动端悬浮窗入口) */
  /* ---------- 语言系统(5 语言) ---------- */
  var I18N = {
    nav_home:{zh:'首页',tw:'首頁',en:'Home',ja:'ホーム',ko:'홈',es:'Inicio'},
    nav_discover:{zh:'发现',tw:'發現',en:'Discover',ja:'発見',ko:'발견',es:'Descubrir'},
    nav_team:{zh:'工作室',tw:'工作室',en:'Studio',ja:'スタジオ',ko:'스튜디오',es:'Estudio'},
    nav_forum:{zh:'论坛',tw:'論壇',en:'Forum',ja:'フォーラム',ko:'포럼',es:'Foro'},
    nav_plugin:{zh:'插件',tw:'插件',en:'Plugins',ja:'プラグイン',ko:'플러그인',es:'Plugins'},
    nav_workspace:{zh:'工作台',tw:'工作台',en:'Workbench',ja:'ワークベンチ',ko:'작업대',es:'Mesa de Trabajo'},
    nav_market:{zh:'插件市场',en:'Plugins',ja:'プラグイン',ko:'플러그인',es:'Plugins',tw:'插件市場'},
    nav_community:{zh:'编程社区',en:'Coding Community',ja:'プログラミングコミュニティ',ko:'코딩 커뮤니티',es:'Comunidad de Código',tw:'編程社區'},
    nav_editor:{zh:'编辑器下载',tw:'編輯器下載',en:'Download Editor',ja:'エディタダウンロード',ko:'에디터 다운로드',es:'Descargar Editor'},
    nav_dev:{zh:'开发者中心',tw:'開發者中心',en:'Developers',ja:'開発者センター',ko:'개발자 센터',es:'Centro de Desarrolladores'},
    nav_docs:{zh:'开发文档',tw:'開發文檔',en:'Docs',ja:'開発ドキュメント',ko:'개발 문서',es:'Documentación'},
    nav_changelog:{zh:'更新记录',en:'Changelog',ja:'更新履歴',ko:'업데이트 내역',es:'Registro',tw:'更新記錄'},
    nav_download:{zh:'下载',en:'Download',ja:'ダウンロード',ko:'다운로드',es:'Descargar',tw:'下載'},
    nav_more:{zh:'更多',en:'More',ja:'もっと見る',ko:'더보기',es:'Más',tw:'更多'},
    menu_title:{zh:'导航菜单',en:'Menu',ja:'メニュー',ko:'메뉴',es:'Menú',tw:'導航菜單'},
    more_title:{zh:'更多功能',en:'More Features',ja:'その他の機能',ko:'추가 기능',es:'Más Funciones',tw:'更多功能'},
    badge_v130:{zh:'全新 v1.3.0',en:'New v1.3.0',ja:'新 v1.3.0',ko:'새 v1.3.0',es:'Nuevo v1.3.0',tw:'全新 v1.3.0'},
    hero_t1:{zh:'现代化图形化编辑器',en:'Modern Visual Editor',ja:'モダンなビジュアルエディタ',ko:'모던 비주얼 에디터',es:'Editor Visual Moderno',tw:'現代化圖形化編輯器'},
    hero_t2:{zh:'为生态而生',en:'Built for the Ecosystem',ja:'エコシステムのために',ko:'생태계를 위해',es:'Hecho para el Ecosistema',tw:'為生態而生'},
    hero_t3:{zh:'for creators',en:'for creators',ja:'クリエイターへ',ko:'크리에이터를 위해',es:'para creadores',tw:'for creators'},
    hero_desc:{zh:'高性能可扩展的图形化编程软件,为开发者提供简单而高效的方式来创建和分发游戏。',en:'A high-performance, extensible visual programming tool to create and publish games simply and efficiently.',ja:'高性能で拡張可能なビジュアルプログラミングソフト。ゲームを簡単・効率的に作成・配信できます。',ko:'고성능 확장 가능한 비주얼 프로그래밍 도구로, 게임을 간단하고 효율적으로 제작·배포할 수 있습니다.',es:'Software de programación visual de alto rendimiento y extensible, para crear y publicar juegos de forma sencilla y eficiente.',tw:'高性能可擴展的圖形化編程軟件,為開發者提供簡單而高效的方式來創建和分發游戏。'},
    btn_dl:{zh:'立即下载',en:'Download Now',ja:'今すぐダウンロード',ko:'지금 다운로드',es:'Descargar Ahora',tw:'立即下載'},
    btn_docs:{zh:'开发文档',en:'Docs',ja:'ドキュメント',ko:'문서',es:'Documentación',tw:'開發文档'},
    btn_more:{zh:'其他产品',en:'More Products',ja:'他の製品',ko:'다른 제품',es:'Otros Productos',tw:'其他产品'},
    term_title:{zh:'拥抱 KN Expanse',en:'Embrace KN Expanse',ja:'KN Expanse を抱きしめよう',ko:'KN Expanse를 안아보세요',es:'Abraza KN Expanse',tw:'擁抱 KN Expanse'},
    why_title:{zh:'为什么选择 ',en:'Why Choose ',ja:'選ばれる理由 ',ko:'선택하는 이유 ',es:'¿Por qué ',tw:'為什么選擇 '},
    core_sub:{zh:'核心能力',en:'Core Powers',ja:'コア機能',ko:'핵심 기능',es:'Poderes Clave',tw:'核心能力'},
    ext_sub:{zh:'为创作加速',en:'Speed Up Creation',ja:'創作を加速',ko:'창작을 가속',es:'Acelera tu Creación',tw:'為創作加速'},
    st_title:{zh:'项目数据',en:'Project Data',ja:'プロジェクトデータ',ko:'프로젝트 데이터',es:'Datos del Proyecto',tw:'項目數據'},
    st_grad:{zh:'实时数据',en:'Live Data',ja:'リアルタイムデータ',ko:'실시간 데이터',es:'Datos en vivo',tw:'實時數據'},
    st_live:{zh:'数据实时更新中',en:'Live Updating',ja:'リアルタイム更新中',ko:'실시간 업데이트 중',es:'Actualización en vivo',tw:'數據實時更新中'},
    step_t1:{zh:'三步开启 ',en:'Start in 3 Steps ',ja:'3ステップで開始 ',ko:'3단계로 시작 ',es:'Empieza en 3 pasos ',tw:'三步開啟 '},
    step_sub:{zh:'创作之旅',en:'Creation Journey',ja:'創作の旅',ko:'창작 여정',es:'Viaje Creativo',tw:'創作之旅'},
    dl_title:{zh:'立即开始创作',en:'Start Creating Now',ja:'今すぐ創作開始',ko:'지금 바로 창작',es:'Empieza a Crear',tw:'立即開始創作'},
    footer_note:{zh:'用热爱创造无限可能',en:'Creating with passion',ja:'情熱で無限の可能性を',ko:'열정으로 무한한 가능성을',es:'Creando con pasión',tw:'用熱愛創造無限可能'},
    qq_title:{zh:'KN Expanse 官方交流群',en:'KN Expanse Official Group',ja:'KN Expanse 公式コミュニティ',ko:'KN Expanse 공식 커뮤니티',es:'Grupo Oficial KN Expanse',tw:'KN Expanse 官方交流群'},
    m_title:{zh:'移动端下载',en:'Mobile Download',ja:'モバイルダウンロード',ko:'모바일 다운로드',es:'Descarga Móvil'},
    m_note:{zh:'移动端下载',en:'Mobile Download',ja:'モバイルダウンロード',ko:'모바일 다운로드',es:'Descarga Móvil',tw:'移動端下載'},
  };

  var I18N_EXTRA = {
    why_sub:{zh:'专为创造者打造的现代图形化编程平台',en:'A modern visual programming platform built for creators',ja:'クリエイターのためのモダンなビジュアルプログラミングプラットフォーム',ko:'크리에이터를 위한 모던 비주얼 프로그래밍 플랫폼',es:'Una plataforma moderna de programación visual para creadores',tw:'專為創造者打造的現代圖形化編程平台'},
    feat_draw_title:{zh:'高性能绘制',en:'High-Perf Rendering',ja:'ハイパフォーマンス描画',ko:'고성능 렌더링',es:'Renderizado de Alto Rendimiento',tw:'高性能繪製'},
    feat_draw_desc:{zh:'GPU 硬件加速,复杂场景依旧丝滑流畅,告别卡顿掉帧。',en:'GPU hardware acceleration keeps complex scenes buttery smooth, no more lag or frame drops.',ja:'GPUハードウェアアクセラレーションで複雑なシーンも滑らかに。カクつき・フレーム落ちを解消。',ko:'GPU 하드웨어 가속으로 복잡한 장면도 매끄럽게, 끊김과 프레임 드롭이 없습니다.',es:'Aceleración por GPU: escenas complejas fluidas, sin lag ni caídas de fotogramas.',tw:'GPU 硬件加速,復杂場景依旧丝滑流暢,告別卡顿掉幀。'},
    feat_draw_li1:{zh:'GPU 加速 · 120 FPS',en:'GPU Accel · 120 FPS',ja:'GPU加速 · 120FPS',ko:'GPU 가속 · 120FPS',es:'GPU · 120 FPS',tw:'GPU 加速 · 120 FPS'},
    feat_draw_li2:{zh:'矢量画布 · 无限缩放',en:'Vector Canvas · Infinite Zoom',ja:'ベクターキャンバス · 無限ズーム',ko:'벡터 캔버스 · 무한 줌',es:'Lienzo vectorial · Zoom infinito',tw:'矢量画佈 · 無限缩放'},
    feat_draw_li3:{zh:'多图层管理',en:'Multi-Layer Management',ja:'多レイヤー管理',ko:'다중 레이어 관리',es:'Gestión multicapa',tw:'多圖层管理'},
    feat_draw_li4:{zh:'实时性能监控',en:'Live Performance Monitor',ja:'リアルタイム性能モニタ',ko:'실시간 성능 모니터',es:'Monitor de rendimiento en vivo',tw:'實時性能监控'},
    feat_draw_chip1:{zh:'GPU 加速',en:'GPU Accel',ja:'GPU加速',ko:'GPU 가속',es:'GPU',tw:'GPU 加速'},
    feat_draw_chip2:{zh:'120 FPS',en:'120 FPS',ja:'120FPS',ko:'120FPS',es:'120 FPS',tw:'120 FPS'},
    feat_vis_title:{zh:'可视化编程',en:'Visual Coding',ja:'ビジュアルプログラミング',ko:'비주얼 프로그래밍',es:'Programación Visual',tw:'可視化編程'},
    feat_vis_desc:{zh:'零门槛节点编辑,拖拽连线即写代码,创意不被语法束缚。',en:'Zero-threshold node editing: drag and connect to code. Creativity is never limited by syntax.',ja:'ハードルゼロのノード編集。ドラッグで配線してコードを書く。構文に縛られない発想を。',ko:'진입 장벽 없는 노드 편집, 드래그 연결만으로 코딩. 구문에 얽매이지 않는 창의성.',es:'Edición de nodos sin curva de aprendizaje: arrastra y conecta para programar.',tw:'零門槛節點編輯,拖拽连線即写代碼,創意不被語法束缚。'},
    feat_vis_li1:{zh:'拖拽连线 · 逻辑清晰',en:'Drag & Connect · Clear Logic',ja:'ドラッグ配線 · わかりやすいロジック',ko:'드래그 연결 · 명확한 로직',es:'Arrastrar y conectar · Lógica clara',tw:'拖拽连線 · 邏輯清晰'},
    feat_vis_li2:{zh:'实时运行调试',en:'Live Run & Debug',ja:'リアルタイム実行・デバッグ',ko:'실시간 실행·디버그',es:'Ejecución y depuración en vivo',tw:'實時运行调试'},
    feat_vis_li3:{zh:'逻辑模板库',en:'Logic Template Library',ja:'ロジックテンプレートライブラリ',ko:'로직 템플릿 라이브러리',es:'Biblioteca de plantillas lógicas',tw:'邏輯模板庫'},
    feat_vis_li4:{zh:'断点排查',en:'Breakpoint Inspection',ja:'ブレークポイント調査',ko:'중단점 검사',es:'Inspección con puntos de interrupción',tw:'断點排查'},
    feat_vis_chip1:{zh:'拖拽连线',en:'Drag & Drop',ja:'ドラッグ&ドロップ',ko:'드래그 앤 드롭',es:'Arrastrar y soltar',tw:'拖拽连線'},
    feat_vis_chip2:{zh:'零代码',en:'No-Code',ja:'ノーコード',ko:'노코드',es:'Sin código',tw:'零代碼'},
    feat_plug_title:{zh:'插件生态',en:'Plugin Ecosystem',ja:'プラグインエコシステム',ko:'플러그인 생태계',es:'Ecosistema de Plugins',tw:'插件生態'},
    feat_plug_desc:{zh:'开放 JS 插件系统,官方与社区共建,一站式获取工具素材。',en:'Open JS plugin system co-built with the community — tools and assets in one place.',ja:'オープンなJSプラグインシステム。公式とコミュニティが協力、ツールと素材をワンストップで。',ko:'개방형 JS 플러그인 시스템, 공식과 커뮤니티가 함께 구축해 도구와 자료를 한곳에서.',es:'Sistema abierto de plugins JS, construido con la comunidad, con herramientas y recursos en un solo lugar.',tw:'開放 JS 插件系统,官方与社区共建,一站式获取工具素材。'},
    feat_plug_li1:{zh:'JS 扩展接口',en:'JS Extension API',ja:'JS拡張インターフェース',ko:'JS 확장 인터페이스',es:'API de extensión JS',tw:'JS 擴展接口'},
    feat_plug_li2:{zh:'官方插件',en:'Official Plugin Market',ja:'公式プラグインマーケット',ko:'공식 플러그인 마켓',es:'Mercado oficial de plugins',tw:'官方插件市場'},
    feat_plug_li3:{zh:'一键安装即用',en:'One-Click Install',ja:'ワンクリックで即インストール',ko:'원클릭 즉시 설치',es:'Instalación con un clic',tw:'一鍵安裝即用'},
    feat_plug_li4:{zh:'上千款素材模板',en:'1000+ Assets & Templates',ja:'1000点以上の素材・テンプレート',ko:'천 개 이상의 에셋·템플릿',es:'+1000 recursos y plantillas',tw:'上千款素材模板'},
    feat_plug_chip1:{zh:'JS 扩展',en:'JS Ext.',ja:'JS拡張',ko:'JS 확장',es:'Ext. JS',tw:'JS 擴展'},
    feat_plug_chip2:{zh:'社区共建',en:'Community',ja:'コミュニティ',ko:'커뮤니티',es:'Comunidad',tw:'社区共建'},
    feat_dist_title:{zh:'快速分发',en:'Quick Distribution',ja:'高速配信',ko:'빠른 배포',es:'Distribución Rápida',tw:'快速分發'},
    feat_dist_desc:{zh:'云存档 + 一键打包,Windows 一键分发,Mac / Linux 版研发中。',en:'Cloud saves + one-click packaging. One-click distribution for Windows; Mac / Linux in development.',ja:'クラウド保存+ワンクリックパッケージ。Windowsはワンクリック配信、Mac / Linux版は開発中。',ko:'클라우드 저장 + 원클릭 패키징. Windows 원클릭 배포, Mac/Linux는 개발 중.',es:'Guardado en la nube + empaquetado en un clic. Distribución para Windows; Mac/Linux en desarrollo.',tw:'雲存档 + 一鍵打包,Windows 一鍵分發,Mac / Linux 版研發中。'},
    feat_dist_li1:{zh:'云端存档 · 无缝切换',en:'Cloud Saves · Seamless Switch',ja:'クラウド保存 · シームレス切替',ko:'클라우드 저장 · 원활한 전환',es:'Guardado en la nube · Cambio fluido',tw:'雲端存档 · 無缝切換'},
    feat_dist_li2:{zh:'Windows 一键打包',en:'Windows One-Click Pack',ja:'Windowsワンクリックパッケージ',ko:'Windows 원클릭 패키징',es:'Empaquetado Windows en un clic',tw:'Windows 一鍵打包'},
    feat_dist_li3:{zh:'发布即上线',en:'Publish & Go Live',ja:'公開すれば即リリース',ko:'게시 즉시 서비스',es:'Publicar y lanzar',tw:'發佈即上線'},
    feat_dist_li4:{zh:'链接一键分享',en:'One-Click Share Link',ja:'ワンクリック共有リンク',ko:'원클릭 공유 링크',es:'Compartir con un clic',tw:'链接一鍵分享'},
    feat_dist_chip1:{zh:'云存档',en:'Cloud Save',ja:'クラウド保存',ko:'클라우드 저장',es:'Nube',tw:'雲存档'},
    feat_more:{zh:'了解更多',en:'Learn More',ja:'詳しく見る',ko:'더 알아보기',es:'Saber más',tw:'了解更多'},
    core_sub2:{zh:'从节点搭建到多端导出,一条龙完成创作',en:'From node building to multi-platform export — create end to end',ja:'ノード構築から多端末エクスポートまで、創作を一気通貫で',ko:'노드 제작부터 멀티 플랫폼 내보내기까지 한 번에',es:'Del ensamblado de nodos a la exportación multiplataforma, todo en uno',tw:'从節點搭建到多端導出,一條龙完成創作'},
    slide1_title:{zh:'节点式编程',en:'Node-Based Coding',ja:'ノードベースプログラミング',ko:'노드 기반 코딩',es:'Programación por Nodos',tw:'節點式編程'},
    slide1_desc:{zh:'可视化节点构建游戏逻辑,拖拽连线即写代码,结构一目了然。',en:'Build game logic with visual nodes — drag and connect, structure at a glance.',ja:'ビジュアルノードでゲームロジックを構築。ドラッグ配線でコードが書け、構造が一目瞭然。',ko:'비주얼 노드로 게임 로직 구성, 드래그 연결로 코딩, 구조가 한눈에.',es:'Construye la lógica del juego con nodos visuales: arrastra y conecta, estructura clara.',tw:'可視化節點構建游戏邏輯,拖拽连線即写代碼,結構一目了然。'},
    slide1_li1:{zh:'拖拽连线 · 所见即所得',en:'Drag & Connect · WYSIWYG',ja:'ドラッグ配線 · 見たままの結果',ko:'드래그 연결 · 위지위그',es:'Arrastrar y conectar · WYSIWYG',tw:'拖拽连線 · 所見即所得'},
    slide1_li2:{zh:'逻辑分支清晰',en:'Clear Logic Branches',ja:'わかりやすい分岐構造',ko:'명확한 로직 분기',es:'Ramas lógicas claras',tw:'邏輯分支清晰'},
    slide1_chip2:{zh:'实时调试',en:'Live Debug',ja:'リアルタイムデバッグ',ko:'실시간 디버그',es:'Depuración en vivo',tw:'實時调试'},
    slide2_title:{zh:'实时预览',en:'Live Preview',ja:'リアルタイムプレビュー',ko:'실시간 미리보기',es:'Vista Previa en Vivo',tw:'實時預覽'},
    slide2_desc:{zh:'所见即所得,修改即时生效,边改边玩,快速迭代。',en:'WYSIWYG with instant updates — tweak and play, iterate fast.',ja:'見たままの結果。変更が即反映され、遊びながら素早く反復。',ko:'위지위그, 수정 즉시 반영, 만들면서 바로 플레이, 빠른 반복.',es:'WYSIWYG con cambios instantáneos: ajusta, juega e itera rápido.',tw:'所見即所得,修改即時生效,边改边玩,快速迭代。'},
    slide2_li1:{zh:'修改即时生效',en:'Instant Updates',ja:'変更即反映',ko:'수정 즉시 반영',es:'Cambios instantáneos',tw:'修改即時生效'},
    slide2_li2:{zh:'分屏同步运行',en:'Split-Screen Sync Run',ja:'分割画面で同期実行',ko:'분할 화면 동기 실행',es:'Ejecución sincronizada en dos pantallas',tw:'分屏同步运行'},
    slide2_chip2:{zh:'即时刷新',en:'Live Refresh',ja:'即時リフレッシュ',ko:'즉시 새로고침',es:'Actualización en vivo',tw:'即時刷新'},
    slide3_title:{zh:'可扩展架构',en:'Extensible Architecture',ja:'拡張可能なアーキテクチャ',ko:'확장 가능한 아키텍처',es:'Arquitectura Extensible',tw:'可擴展架構'},
    slide3_desc:{zh:'模块化设计,开放 JS 扩展接口,社区共建无限可能。',en:'Modular design with an open JS extension API — endless possibilities with the community.',ja:'モジュール設計とオープンなJS拡張IF。コミュニティと無限の可能性を。',ko:'모듈식 설계와 개방형 JS 확장 인터페이스, 커뮤니티와 무한한 가능성.',es:'Diseño modular con API de extensión JS abierta: posibilidades infinitas con la comunidad.',tw:'模塊化設計,開放 JS 擴展接口,社区共建無限可能。'},
    slide3_li1:{zh:'模块化内核',en:'Modular Core',ja:'モジュール化されたコア',ko:'모듈식 코어',es:'Núcleo modular',tw:'模塊化內核'},
    slide3_li2:{zh:'开放 API 自定义',en:'Open API Customization',ja:'オープンAPIでカスタム',ko:'개방형 API 커스터마이즈',es:'Personalización con API abierta',tw:'開放 API 自定义'},
    slide3_chip2:{zh:'模块化',en:'Modular',ja:'モジュール式',ko:'모듈식',es:'Modular',tw:'模塊化'},
    slide4_title:{zh:'多平台导出',en:'Multi-Platform Export',ja:'マルチプラットフォーム出力',ko:'멀티 플랫폼 내보내기',es:'Exportación Multiplataforma',tw:'多平台導出'},
    slide4_desc:{zh:'一键导出多平台格式,Windows / macOS / Linux 全覆盖。',en:'One-click export to multiple platforms: Windows / macOS / Linux.',ja:'ワンクリックで多形式出力。Windows / macOS / Linux 完全対応。',ko:'원클릭 멀티 플랫폼 내보내기, Windows/macOS/Linux 전부 지원.',es:'Exportación en un clic a varias plataformas: Windows / macOS / Linux.',tw:'一鍵導出多平台格式,Windows / macOS / Linux 全覆盖。'},
    slide4_li1:{zh:'Windows 导出',en:'Windows Export',ja:'Windows出力',ko:'Windows 내보내기',es:'Exportar a Windows',tw:'Windows 導出'},
    slide4_li2:{zh:'包体体积优化',en:'Package Size Optimization',ja:'パッケージ最適化',ko:'패키지 용량 최적화',es:'Optimización de tamaño',tw:'包體體积優化'},
    slide4_chip1:{zh:'win · mac · linux',en:'win · mac · linux',ja:'win · mac · linux',ko:'win · mac · linux',es:'win · mac · linux',tw:'win · mac · linux'},
    ext_sub2:{zh:'社区精选扩展,一键安装即用 · 自动轮播',en:'Community-picked extensions, one-click install · auto-rotating',ja:'コミュニティ厳選の拡張。ワンクリックで即利用 · 自動巡回',ko:'커뮤니티 선별 확장, 원클릭 설치 · 자동 회전',es:'Extensiones seleccionadas por la comunidad, instalación en un clic · rotación automática',tw:'社区精選擴展,一鍵安裝即用 · 自動輪播'},
    ext1_title:{zh:'粒子特效扩展包',en:'Particle FX Pack',ja:'パーティクルエフェクトパック',ko:'파티클 이펙트 팩',es:'Paquete de Partículas',tw:'粒子特效擴展包'},
    ext1_author:{zh:'by @KnitStudio · 130k 安装',en:'by @KnitStudio · 130k installs',ja:'by @KnitStudio · 13万インストール',ko:'by @KnitStudio · 13만 설치',es:'por @KnitStudio · 130k instalaciones',tw:'by @KnitStudio · 130k 安裝'},
    ext1_desc:{zh:'上百种粒子效果,一键为场景添加爆炸、烟尘、星光与魔法光效。',en:'Hundreds of particle effects: explosions, smoke, stardust and magic glows in one click.',ja:'100種類以上のパーティクル効果。爆発・煙・星屑・魔法エフェクトをワンクリックで。',ko:'수백 가지 파티클 효과, 폭발·연기·별빛·마법 광효과를 원클릭으로.',es:'Cientos de efectos de partículas: explosiones, humo, polvo de estrellas y brillos mágicos.',tw:'上百種粒子效果,一鍵為場景添加爆炸、烟尘、星光与魔法光效。'},
    ext2_title:{zh:'UI 界面素材库',en:'UI Assets Library',ja:'UI素材ライブラリ',ko:'UI 에셋 라이브러리',es:'Biblioteca de Assets UI',tw:'UI 界面素材庫'},
    ext2_author:{zh:'by @MixUI · 96k 安装',en:'by @MixUI · 96k installs',ja:'by @MixUI · 9.6万インストール',ko:'by @MixUI · 9.6만 설치',es:'por @MixUI · 96k instalaciones',tw:'by @MixUI · 96k 安裝'},
    ext2_desc:{zh:'精致按钮、面板、进度条等 200+ 组件模板,拖拽即用,统一风格。',en:'200+ component templates: buttons, panels, progress bars — drag and use, consistent style.',ja:'ボタン・パネル・プログレスバーなど200+のコンポーネント。ドラッグですぐ使えて統一感も。',ko:'버튼, 패널, 진행바 등 200+ 컴포넌트 템플릿, 드래그로 즉시 사용.',es:'+200 plantillas: botones, paneles, barras de progreso — arrastra y usa.',tw:'精致按钮、面板、進度條等 200+ 組件模板,拖拽即用,统一风格。'},
    ext3_title:{zh:'数据可视化工具',en:'Data Visualization Tools',ja:'データ可視化ツール',ko:'데이터 시각화 도구',es:'Herramientas de Visualización',tw:'數據可視化工具'},
    ext3_author:{zh:'by @DataLab · 74k 安装',en:'by @DataLab · 74k installs',ja:'by @DataLab · 7.4万インストール',ko:'by @DataLab · 7.4만 설치',es:'por @DataLab · 74k instalaciones',tw:'by @DataLab · 74k 安裝'},
    ext3_desc:{zh:'图表节点与仪表盘模板,让游戏数据流动起来,复盘一目了然。',en:'Chart nodes and dashboard templates — make game data flow and reviews crystal clear.',ja:'チャートノードとダッシュボードで、ゲームデータを見える化し振り返りも一目瞭然。',ko:'차트 노드와 대시보드 템플릿으로 게임 데이터를 시각화, 분석이 한눈에.',es:'Nodos de gráficos y plantillas de panel: visualiza datos del juego y analiza con claridad.',tw:'圖表節點与仪表盤模板,讓游戏數據流動起來,復盤一目了然。'},
    ext_view:{zh:'查看',en:'View',ja:'見る',ko:'보기',es:'Ver',tw:'查看'},
    ext_market:{zh:'进入正式插件',en:'Go to Plugin Market',ja:'公式プラグインマーケットへ',ko:'공식 플러그인 마켓으로',es:'Ir al Mercado de Plugins',tw:'進入正式插件市場'},
    dl_sub:{zh:'选择你的平台,下载 KN Expanse 桌面版',en:'Choose your platform and download KN Expanse desktop',ja:'プラットフォームを選んで KN Expanse デスクトップ版をダウンロード',ko:'플랫폼을 선택하고 KN Expanse 데스크톱을 다운로드하세요',es:'Elige tu plataforma y descarga KN Expanse para escritorio',tw:'選擇你的平台,下載 KN Expanse 桌面版'},
    dl_win:{zh:'Windows',en:'Windows',ja:'Windows',ko:'Windows',es:'Windows',tw:'Windows'},
    dl_win_ver:{zh:'KN Expanse v1.3.0 · 64位 exe',en:'KN Expanse v1.3.0 · 64-bit exe',ja:'KN Expanse v1.3.0 · 64bit exe',ko:'KN Expanse v1.3.0 · 64비트 exe',es:'KN Expanse v1.3.0 · exe 64 bits',tw:'KN Expanse v1.3.0 · 64位 exe'},
    dl_mac:{zh:'macOS',en:'macOS',ja:'macOS',ko:'macOS',es:'macOS',tw:'macOS'},
    dl_mac_ver:{zh:'Apple Silicon / Intel · 研发中',en:'Apple Silicon / Intel · In Development',ja:'Apple Silicon / Intel · 開発中',ko:'Apple Silicon / Intel · 개발 중',es:'Apple Silicon / Intel · En desarrollo',tw:'Apple Silicon / Intel · 研發中'},
    dl_linux:{zh:'Linux',en:'Linux',ja:'Linux',ko:'Linux',es:'Linux',tw:'Linux'},
    dl_linux_ver:{zh:'AppImage / deb · 研发中',en:'AppImage / deb · In Development',ja:'AppImage / deb · 開発中',ko:'AppImage / deb · 개발 중',es:'AppImage / deb · En desarrollo',tw:'AppImage / deb · 研發中'},
    dl_go:{zh:'下载',en:'Download',ja:'ダウンロード',ko:'다운로드',es:'Descargar',tw:'下載'},
    dl_soon:{zh:'即将推出',en:'Coming Soon',ja:'近日公開',ko:'출시 예정',es:'Próximamente',tw:'即將推出'},
    m_slogan:{zh:'轻松享受编程创意',en:'Enjoy coding creativity with ease',ja:'プログラミングの創造を気軽に楽しもう',ko:'코딩 창의성을 가볍게 즐기세요',es:'Disfruta la creatividad al programar',tw:'輕鬆享受編程創意'},
    m_android:{zh:'安卓下载',en:'Android Download',ja:'Android ダウンロード',ko:'Android 다운로드',es:'Descargar Android',tw:'安卓下載'},
    m_ios:{zh:'iOS 下载',en:'iOS Download',ja:'iOS ダウンロード',ko:'iOS 다운로드',es:'Descargar iOS',tw:'iOS 下載'},
    m_qq:{zh:'加入 QQ 群',en:'Join QQ Group',ja:'QQグループに参加',ko:'QQ 그룹 가입',es:'Unirse al grupo QQ',tw:'加入 QQ 群'},
    m_detail:{zh:'查看详细介绍',en:'View Details',ja:'詳細を見る',ko:'상세 보기',es:'Ver detalles',tw:'查看詳細介紹'},
    m_back:{zh:'下载',en:'Download',ja:'ダウンロード',ko:'다운로드',es:'Descargar',tw:'下載'},
    perf_badge:{zh:'▶ 运行中 · 120 FPS',en:'▶ Running · 120 FPS',ja:'▶ 実行中 · 120FPS',ko:'▶ 실행 중 · 120FPS',es:'▶ En ejecución · 120 FPS',tw:'▶ 运行中 · 120 FPS'},

    toast_coming:{zh:' 版正在研发中,敬请期待',en:' version is in development, stay tuned',ja:' 版は開発中です。お楽しみに',ko:' 버전은 개발 중입니다. 기대해 주세요',es:' versión en desarrollo, estad atentos',tw:' 版正在研發中,敬请期待'},
    toast_doc:{zh:'开发文档页面即将上线,敬请期待',en:'Dev docs coming soon, stay tuned',ja:'開発ドキュメントは近日公開予定',ko:'개발 문서가 곧 공개됩니다',es:'Documentación próximamente',tw:'開發文檔頁面即將上線,敬請期待'},
    toast_more:{zh:'更多产品敬请期待',en:'More products coming soon',ja:'その他の製品は近日公開',ko:'더 많은 제품이 곧 출시됩니다',es:'Más productos próximamente',tw:'更多產品敬請期待'},
  };
  Object.keys(I18N_EXTRA).forEach(function (k) { I18N[k] = I18N_EXTRA[k]; });
  var I18N_QR = {
    qr_tab_m:{zh:'移动端下载',tw:'移動端下載',en:'Mobile Download',ja:'モバイルダウンロード',ko:'모바일 다운로드',es:'Descarga Móvil'},
    qr_tab_q:{zh:'QQ 群',tw:'QQ 群',en:'QQ Group',ja:'QQグループ',ko:'QQ 그룹',es:'Grupo QQ'}
  };
  Object.keys(I18N_QR).forEach(function (k) { I18N[k] = I18N_QR[k]; });
  var I18N_PAGE = {
    dl_m_title:{zh:'移动端下载',tw:'移動端下載',en:'Mobile Download',ja:'モバイルダウンロード',ko:'모바일 다운로드',es:'Descarga Móvil'},
    dl_android:{zh:'安卓下载',tw:'安卓下載',en:'Android Download',ja:'Android ダウンロード',ko:'Android 다운로드',es:'Descargar Android'},
    dl_ios:{zh:'iOS · 正在研发',tw:'iOS · 正在研發',en:'iOS · In Development',ja:'iOS · 開発中',ko:'iOS · 개발 중',es:'iOS · En desarrollo'},
    dl_ios_tip:{zh:'iOS 版正在研发中,敬请期待',tw:'iOS 版正在研發中,敬請期待',en:'iOS version is in development, stay tuned',ja:'iOS版は開発中です。お楽しみに',ko:'iOS 버전은 개발 중입니다. 기대해 주세요',es:'La versión iOS está en desarrollo, estad atentos'},
    fl_title:{zh:'友情链接',tw:'友情連結',en:'Friends',ja:'リンク',ko:'링크',es:'Enlaces'},
    cr_title:{zh:'制作团队',tw:'製作團隊',en:'Credits',ja:'制作チーム',ko:'제작 팀',es:'Créditos'}
  };
  Object.keys(I18N_PAGE).forEach(function (k) { I18N[k] = I18N_PAGE[k]; });
  var I18N_CR = {
    cr_role_0:{zh:'创始人 & 核心开发',tw:'創始人 & 核心開發',en:'Founder & Core Dev',ja:'創始者 & コア開発',ko:'창립자 & 핵심 개발',es:'Fundador y Dev Core'},
    cr_desc_0:{zh:'KNExpanse 项目发起人,构思产品整体框架,负责核心功能开发,决定项目后续更新方向。',tw:'KNExpanse 專案發起人,構思產品整體框架,負責核心功能開發,決定專案後續更新方向。',en:'Founder of KNExpanse, designed the overall product framework, leads core development and sets future update direction.',ja:'KNExpanseの発起人。製品全体の枠組みを設計し、コア開発を担当、今後の更新方針を決定。',ko:'KNExpanse 창립자, 제품 전체 프레임워크 설계, 핵심 개발 담당, 향후 업데이트 방향 결정.',es:'Fundador de KNExpanse, diseñó el marco general, lidera el desarrollo core y define la dirección futura.'},
    cr_role_1:{zh:'前后端 + JS 开发',tw:'前後端 + JS 開發',en:'Full-Stack + JS Dev',ja:'フルスタック + JS開発',ko:'풀스택 + JS 개발',es:'Full-stack + Dev JS'},
    cr_desc_1:{zh:'包揽前端页面、后端服务和数据库相关开发,搭建私有化云平台,保障云端功能稳定不掉线。',tw:'包攬前端頁面、後端服務和資料庫相關開發,搭建私有化雲平台,保障雲端功能穩定不掉線。',en:'Owns frontend, backend and database development; built the private cloud platform to keep cloud features stable.',ja:'フロントエンド・バックエンド・DB開発を担当。プライベートクラウドを構築し安定運用を実現。',ko:'프론트엔드, 백엔드, DB 개발 담당, 프라이빗 클라우드 플랫폼 구축.',es:'Desarrollo frontend, backend y BD; construyó la plataforma cloud privada estable.'},
    cr_role_2:{zh:'UI 设计',tw:'UI 設計',en:'UI Design',ja:'UIデザイン',ko:'UI 디자인',es:'Diseño UI'},
    cr_desc_2:{zh:'大名鼎鼎的 Vibecoding 之神(bushi)!全权负责界面视觉与交互设计,敲定页面布局、动画效果,打造整套项目视觉风格。',tw:'大名鼎鼎的 Vibecoding 之神(bushi)!全權負責介面視覺與互動設計,敲定頁面佈局、動畫效果,打造整套專案視覺風格。',en:'The legendary Vibecoding god (bushi)! Owns all visual & interaction design, page layout, animations and the whole visual identity.',ja:'伝説のVibecodingの神(bushi)!UI/UXデザイン、レイアウト、アニメーションなど全体のビジュアルを統括。',ko:'전설의 Vibecoding 신(bushi)! UI/UX 디자인, 레이아웃, 애니메이션 등 전체 비주얼 담당.',es:'El legendario dios del Vibecoding (bushi). Dueño del diseño visual, interacciones, layout y animaciones.'},
    cr_role_3:{zh:'特别感谢',tw:'特別感謝',en:'Special Thanks',ja:'特別協力',ko:'특별 감사',es:'Agradecimiento Especial'},
    cr_desc_3:{zh:'开发过程中交流技术,提供思路与指导,给予项目支持。',tw:'開發過程中交流技術,提供思路與指導,給予專案支持。',en:'Shared technical insights and guidance throughout development, and gave the project great support.',ja:'開発中の技術交流やアドバイス、プロジェクトへの多大なサポート。',ko:'개발 과정에서 기술 교류, 아이디어와 지도 제공, 프로젝트 지원.',es:'Compartió ideas y guía técnica durante el desarrollo, y apoyó el proyecto.'},
    fl_0:{zh:'点猫科技',tw:'點貓科技',en:'Codemao',ja:'CodeMao',ko:'Codemao',es:'Codemao'},
    fl_1:{zh:'KNHX工作室',tw:'KNHX工作室',en:'KNHX Studio',ja:'KNHXスタジオ',ko:'KNHX 스튜디오',es:'KNHX Studio'},
    fl_2:{zh:'CatCode',tw:'CatCode',en:'CatCode',ja:'CatCode',ko:'CatCode',es:'CatCode'},
    qr_scan_tip:{zh:'手机扫码,立即下载 KN Expanse',tw:'手機掃碼,立即下載 KN Expanse',en:'Scan with your phone to download KN Expanse now',ja:'スマホでQRコードを読み取り、今すぐKN Expanseをダウンロード',ko:'휴대폰으로 QR코드를 스캔해 KN Expanse를 바로 다운로드하세요',es:'Escanea con tu móvil y descarga KN Expanse ahora'}
  };
  Object.keys(I18N_CR).forEach(function (k) { I18N[k] = I18N_CR[k]; });
  var I18N_NEW = {
    theme_aurora:{zh:'极光紫霞',en:'Aurora Violet',ja:'オーロラ紫',ko:'오로라 바이올렛',es:'Aurora Violeta',tw:'极光紫霞'},
    theme_ocean:{zh:'深海琉璃',en:'Deep Sea Glass',ja:'深海ガラス',ko:'심해 글라스',es:'Vidrio de Mar Profundo',tw:'深海琉璃'},
    theme_amber:{zh:'琥珀暮光',en:'Amber Twilight',ja:'アンバー黄昏',ko:'앰버 황혼',es:'Crepúsculo Ámbar',tw:'琥珀暮光'},
    theme_dark:{zh:'暗夜模式',en:'Dark Mode',ja:'ダークモード',ko:'다크 모드',es:'Modo Oscuro',tw:'暗夜模式'},
    core_title:{zh:'强大编辑器',en:'Powerful Editor',ja:'パワフルエディタ',ko:'강력한 에디터',es:'Editor Poderoso',tw:'強大編輯器'},
    ext_title:{zh:'优秀扩展',en:'Featured Extensions',ja:'注目の拡張機能',ko:'우수 확장 기능',es:'Extensiones Destacadas',tw:'優秀擴展'},
    st_sub:{zh:'核心指标一览 · 实时更新',en:'Core metrics · live updates',ja:'主要指標 · リアルタイム更新',ko:'핵심 지표 · 실시간 업데이트',es:'Métricas clave · actualización en vivo',tw:'核心指標一覽 · 實時更新'},
    st_dev_label:{zh:'活跃开发者',en:'Active Developers',ja:'アクティブ開発者',ko:'활성 개발자',es:'Desarrolladores Activos',tw:'活跃開發者'},
    st_dev_s1:{zh:'周新增',en:'Weekly New',ja:'週間新規',ko:'주간 신규',es:'Nuevos/Semana',tw:'周新增'},
    st_dev_s2:{zh:'月活跃',en:'Monthly Active',ja:'月間アクティブ',ko:'월간 활성',es:'Activos/Mes',tw:'月活跃'},
    st_dev_s3:{zh:'覆盖地区',en:'Regions Covered',ja:'カバー地域',ko:'커버 지역',es:'Regiones Cubiertas',tw:'覆盖地区'},
    st_proj_label:{zh:'项目创建',en:'Projects Created',ja:'プロジェクト作成数',ko:'프로젝트 생성',es:'Proyectos Creados',tw:'項目創建'},
    st_proj_s1:{zh:'周创建',en:'Weekly Created',ja:'週間作成',ko:'주간 생성',es:'Creados/Semana',tw:'周創建'},
    st_proj_s2:{zh:'累计下载',en:'Total Downloads',ja:'累計ダウンロード',ko:'누적 다운로드',es:'Descargas Totales',tw:'累計下載'},
    st_proj_s3:{zh:'模板库',en:'Template Library',ja:'テンプレート数',ko:'템플릿 라이브러리',es:'Biblioteca de Plantillas',tw:'模板庫'},
    st_upt_label:{zh:'发布帖子',en:'Posts Published',ja:'投稿数',ko:'게시물 수',es:'Publicaciones',tw:'發布帖子'},
    st_upt_s1:{zh:'今日发布',en:'Today',ja:'今日の投稿',ko:'오늘의 게시물',es:'Hoy',tw:'今日發布'},
    st_upt_s2:{zh:'本周热度',en:'This Week',ja:'今週の投稿',ko:'이번 주 게시물',es:'Esta Semana',tw:'本週熱度'},
    st_upt_s3:{zh:'累计点赞',en:'Total Likes',ja:'総いいね',ko:'누적 좋아요',es:'Me Gusta Totales',tw:'累計點讚'},
    step1_title:{zh:'下载安装',en:'Download & Install',ja:'ダウンロードしてインストール',ko:'다운로드 및 설치',es:'Descargar e Instalar',tw:'下載安裝'},
    step1_desc:{zh:'选择平台版本,一键安装强大编辑器,即装即用。',en:'Choose your platform, install the powerful editor in one click, ready to go.',ja:'プラットフォームを選んでワンクリックインストール。すぐに使えます。',ko:'플랫폼을 선택하고 원클릭 설치, 바로 사용 가능.',es:'Elige tu plataforma, instala el editor en un clic y listo.',tw:'選擇平台版本,一鍵安裝強大編輯器,即裝即用。'},
    step2_title:{zh:'拖拽创作',en:'Drag to Create',ja:'ドラッグで創作',ko:'드래그로 창작',es:'Crea Arrastrando',tw:'拖拽創作'},
    step2_desc:{zh:'内置组件库,拖拽搭建场景与逻辑,创意即刻成型。',en:'Built-in component library — drag to build scenes and logic, ideas take shape instantly.',ja:'内蔵コンポーネントでドラッグするだけでシーンとロジックを構築。',ko:'내장 컴포넌트 라이브러리로 드래그만으로 장면과 로직 구성.',es:'Biblioteca integrada: arrastra para construir escenas y lógica al instante.',tw:'內置組件庫,拖拽搭建場景与邏輯,創意即刻成型。'},
    step3_title:{zh:'发布分发',en:'Publish & Distribute',ja:'公開・配信',ko:'게시 및 배포',es:'Publicar y Distribuir',tw:'發佈分發'},
    step3_desc:{zh:'一键导出多平台工程,云分发触达全球玩家。',en:'One-click export to multiple platforms, cloud distribution reaches players worldwide.',ja:'ワンクリックで多形式出力。クラウド配信で世界中のプレイヤーへ。',ko:'원클릭 멀티 플랫폼 내보내기, 클라우드 배포로 전 세계 플레이어에게.',es:'Exporta en un clic y distribuye por la nube a jugadores de todo el mundo.',tw:'一鍵導出多平台工程,雲分發触达全球玩家。'},
    step2_chip1:{zh:'组件库',en:'Components',ja:'コンポーネント',ko:'컴포넌트',es:'Componentes',tw:'組件庫'},
    step2_chip2:{zh:'可视化逻辑',en:'Visual Logic',ja:'ビジュアルロジック',ko:'비주얼 로직',es:'Lógica Visual',tw:'可視化邏輯'},
    step3_chip1:{zh:'多平台',en:'Multi-Platform',ja:'マルチプラットフォーム',ko:'멀티 플랫폼',es:'Multiplataforma',tw:'多平台'},
    step3_chip2:{zh:'云分发',en:'Cloud Distribution',ja:'クラウド配信',ko:'클라우드 배포',es:'Distribución en la Nube',tw:'雲分發'}
  };
  Object.keys(I18N_NEW).forEach(function (k) { I18N[k] = I18N_NEW[k]; });
  var I18N_MK = {
    mk_badge:{zh:'插件',tw:'插件市場',en:'Plugin Market',ja:'プラグインマーケット',ko:'플러그인 마켓',es:'Mercado de Plugins'},
    mk_sub:{zh:'market',tw:'market',en:'market',ja:'market',ko:'market',es:'market'},
    mk_more:{zh:'更多',tw:'更多',en:'More',ja:'もっと見る',ko:'더보기',es:'Más'},
    mk_t1:{zh:'发现优秀插件',tw:'發現優秀插件',en:'Discover Great Plugins',ja:'素晴らしいプラグインを見つける',ko:'훌륭한 플러그인 발견',es:'Descubre Grandes Plugins'},
    mk_t2:{zh:'为创作加速',tw:'為創作加速',en:'Speed Up Creation',ja:'創作を加速',ko:'창작을 가속',es:'Acelera tu Creación'},
    mk_t3:{zh:'plugins',en:'plugins',ja:'plugins',ko:'plugins',es:'plugins',tw:'plugins'},
    mk_ph:{zh:'搜索插件名称 / 标签 / 作者',tw:'搜索插件名稱 / 標籤 / 作者',en:'Search by name / tag / author',ja:'名前 / タグ / 作者で検索',ko:'이름 / 태그 / 작성자 검색',es:'Buscar por nombre / etiqueta / autor'},
    mk_empty:{zh:'没有找到匹配的插件',tw:'沒有找到匹配的插件',en:'No matching plugins found',ja:'一致するプラグインが見つかりません',ko:'일치하는 플러그인이 없습니다',es:'No se encontraron plugins'},
    mk_prev:{zh:'上一页',tw:'上一頁',en:'Prev',ja:'前へ',ko:'이전',es:'Anterior'},
    mk_next:{zh:'下一页',tw:'下一頁',en:'Next',ja:'次へ',ko:'다음',es:'Siguiente'},
    mk_dl:{zh:'下载',tw:'下載',en:'Download',ja:'ダウンロード',ko:'다운로드',es:'Descargar'},
    mk_workpool:{zh:'作品池',tw:'作品池',en:'Works',ja:'作品',ko:'작품',es:'Trabajos'},
    mk_dev:{zh:'开发者中心',tw:'開發者中心',en:'Developer Center',ja:'開発者センター',ko:'개발자 센터',es:'Centro de Desarrolladores'},
    mk_storage:{zh:'我的存储',tw:'我的存儲',en:'My Storage',ja:'マイストレージ',ko:'내 저장소',es:'Mi Almacenamiento'},
    mk_home:{zh:'首页',tw:'首頁',en:'Home',ja:'ホーム',ko:'홈',es:'Inicio'},
    mk_discover:{zh:'发现',tw:'發現',en:'Discover',ja:'発見',ko:'발견',es:'Descubrir'},
    mk_team:{zh:'团队',tw:'團隊',en:'Team',ja:'チーム',ko:'팀',es:'Equipo'},
    mk_forum:{zh:'论坛',tw:'論壇',en:'Forum',ja:'フォーラム',ko:'포럼',es:'Foro'},
    mk_appdl:{zh:'应用下载',tw:'應用下載',en:'App Downloads',ja:'アプリダウンロード',ko:'앱 다운로드',es:'Descargas'},
    mk_login:{zh:'登录',tw:'登錄',en:'Login',ja:'ログイン',ko:'로그인',es:'Iniciar sesión'},
    mk_latest:{zh:'最新',tw:'最新',en:'Latest',ja:'最新',ko:'최신',es:'Recientes'},
    mk_hot:{zh:'最热',tw:'最熱',en:'Hot',ja:'人気',ko:'인기',es:'Populares'},
    mk_top:{zh:'评分最高',tw:'評分最高',en:'Top Rated',ja:'高評価',ko:'최고 평점',es:'Mejor Valorados'},
    mk_like:{zh:'最多赞',tw:'最多讚',en:'Most Liked',ja:'最多いいね',ko:'좋아요 많은',es:'Más Gustados'},
    mk_fav:{zh:'最多收藏',tw:'最多收藏',en:'Most Favorited',ja:'最多ブックマーク',ko:'저장 많은',es:'Más Favoritos'},
    mk_coin:{zh:'最多投币',tw:'最多投幣',en:'Most Coins',ja:'最多コイン',ko:'코인 많은',es:'Más Monedas'},
    mk_comment:{zh:'最多评论',tw:'最多評論',en:'Most Comments',ja:'最多コメント',ko:'댓글 많은',es:'Más Comentarios'},
    mk_all:{zh:'全部',tw:'全部',en:'All',ja:'すべて',ko:'전체',es:'Todos'},
    mk_filter:{zh:'筛选',tw:'篩選',en:'Filter',ja:'絞り込み',ko:'필터',es:'Filtrar'},
    mk_no_cover:{zh:'图片未找到',tw:'圖片未找到',en:'No image',ja:'画像なし',ko:'이미지 없음',es:'Sin imagen'}
  };
  Object.keys(I18N_MK).forEach(function (k) { I18N[k] = I18N_MK[k]; });
  var LANGS = ['zh','tw','en','ja','ko','es'];
  var curLang = 'zh';
  try { var lsLang = localStorage.getItem('knexpanse-lang'); if (LANGS.indexOf(lsLang) >= 0) curLang = lsLang; } catch (e) {}
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var t = I18N[k];
      if (t && t[curLang]) el.textContent = t[curLang];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph');
      var t = I18N[k];
      if (t && t[curLang]) el.setAttribute('placeholder', t[curLang]);
    });
    $$('.lang-item').forEach(function (it) { it.classList.toggle('cur', it.dataset.lang === curLang); });
    document.documentElement.lang = curLang === 'zh' ? 'zh-CN' : (curLang === 'tw' ? 'zh-TW' : curLang);
    /* 插件已加载时,按当前语言重渲染(名称/标签实时翻译) */
    if (typeof allPlugins !== 'undefined' && allPlugins.length && typeof renderMarket === 'function') renderMarket();
    /* 已选中的筛选/排序 label 跟随语言(默认值由 data-i18n 处理,不在此覆盖) */
    if (typeof curFilter !== 'undefined' && curFilter !== 'all' && typeof l10nTag === 'function') {
      var _fl = $('#mkFilterLabel');
      if (_fl) _fl.textContent = l10nTag(curFilter);
    }
    if (typeof curSort !== 'undefined' && curSort !== 'latest') {
      var _sl = $('#mkSortLabel');
      if (_sl) {
        var _sk = curSort === 'top' ? 'mk_top' : 'mk_all';
        var _st = I18N[_sk];
        if (_st && _st[curLang]) _sl.textContent = _st[curLang];
      }
    }
  }
  applyLang();
  var langBtn = $('#langBtn');
  var langPop = $('#langPop');
  var langTimer = null;
  var qrModal = $('#qrModal');
  var dlAndroidBtn = $('#dlAndroidBtn');
  if (dlAndroidBtn) dlAndroidBtn.addEventListener('click', function () {
    if (isMobileUA) {
      /* 移动端:直接跳下载链接,不做扫码 */
      window.open('/localcdn/2/app-debug.apk', '_blank');
    } else if (qrModal) {
      qrModal.classList.add('show');
    }
  });
  if (qrModal) qrModal.addEventListener('click', function (e) { if (e.target === qrModal || e.target.id === 'qrModalClose') qrModal.classList.remove('show'); });
  var qrBtn = $('#qrBtn'), qrPop = $('#qrPop'), qrTimer = null, qrAutoT = null;
  var lookBtn = $('#lookBtn'), lookPop = $('#lookPop'), lookTimer = null;
  function hideQrPop() { clearTimeout(qrAutoT); qrTimer = setTimeout(function () { if(qrPop) qrPop.classList.remove('show'); unlockBtnId = null; syncNavLock(); }, 250); }
  function hideLookPop() { lookTimer = setTimeout(function () { if(lookPop) lookPop.classList.remove('show'); unlockBtnId = null; syncNavLock(); }, 250); }
  function showQr(btn) {
    if (!isMobileUA && otherPopOpen('.qr-pop.show')) return;
    clearTimeout(qrTimer);
    clearTimeout(qrAutoT);
    if(langPop) langPop.classList.remove('show'); clearTimeout(langTimer);
    if(lookPop) lookPop.classList.remove('show'); clearTimeout(lookTimer);
    /* 移动端:二维码二级菜单只保留 QQ 群码(不展示移动端下载码) */
    if (isMobileUA) {
      $$('.qr-tab').forEach(function (x) { x.classList.toggle('active', x.dataset.q === 'q'); });
      $$('.qr-pane').forEach(function (p) { p.classList.toggle('show', p.dataset.q === 'q'); });
    }
    if(qrPop && btn) posPop(qrPop, btn); else if(qrPop && qrBtn) posPop(qrPop, qrBtn); if(qrPop) qrPop.classList.add('show'); unlockBtnId = 'qrBtn'; syncNavLock();
    /* 桌面 hover:鼠标离开悬浮窗 1.2s 后自动关闭,防止残留 */
    qrAutoT = setTimeout(function () {
      if (hoverPop && qrPop && !qrPop.matches(':hover') && qrBtn && !qrBtn.matches(':hover')) {
        qrPop.classList.remove('show'); unlockBtnId = null; syncNavLock();
      }
    }, 1200);
  }
  function showLook(btn) {
    if (!isMobileUA && otherPopOpen('.look-pop.show')) return;
    clearTimeout(lookTimer);
    if(langPop) langPop.classList.remove('show'); clearTimeout(langTimer);
    if(qrPop) qrPop.classList.remove('show'); clearTimeout(qrTimer); clearTimeout(qrAutoT);
    if(lookPop && btn) posPop(lookPop, btn); else if(lookPop && lookBtn) posPop(lookPop, lookBtn); if(lookPop) lookPop.classList.add('show'); unlockBtnId = 'lookBtn'; syncNavLock();
  }
  var qrOpenT = null, lookOpenT = null;
  if (qrBtn && qrPop) {
    qrBtn.addEventListener('mouseenter', function () { if (!hoverPop) return; clearTimeout(qrOpenT); qrOpenT = setTimeout(showQr, 300); });
    qrBtn.addEventListener('mouseleave', function () { if (!hoverPop) return; clearTimeout(qrOpenT); hideQrPop(); });
    qrPop.addEventListener('mouseenter', function () { if (!hoverPop) return; showQr(); });
    qrPop.addEventListener('mouseleave', function () { if (!hoverPop) return; hideQrPop(); });
  }
  if (lookBtn && lookPop) {
    lookBtn.addEventListener('mouseenter', function () { if (!hoverPop) return; clearTimeout(lookOpenT); lookOpenT = setTimeout(showLook, 300); });
    lookBtn.addEventListener('mouseleave', function () { if (!hoverPop) return; clearTimeout(lookOpenT); hideLookPop(); });
    lookPop.addEventListener('mouseenter', function () { if (!hoverPop) return; showLook(); });
    lookPop.addEventListener('mouseleave', function () { if (!hoverPop) return; hideLookPop(); });
  }
  /* 移动端:悬浮窗点击交互——点按钮弹出二级菜单,点选项/外部关闭 */
  if (isMobileUA) {
    var closeAllPops = function () {
      [qrPop, lookPop, langPop].forEach(function (p) {
        if (p && p.classList.contains('show')) {
          p.classList.remove('show');
        }
      });
      unlockBtnId = null;
    };
    if (qrBtn && qrPop) qrBtn.addEventListener('click', function (e) { e.stopPropagation(); if (qrPop.classList.contains('show')) { hideQrPop(); } else { closeAllPops(); showQr(); } });
    if (lookBtn && lookPop) lookBtn.addEventListener('click', function (e) { e.stopPropagation(); if (lookPop.classList.contains('show')) { hideLookPop(); } else { closeAllPops(); showLook(); } });
    if (langBtn && langPop) langBtn.addEventListener('click', function (e) { e.stopPropagation(); if (langPop.classList.contains('show')) { hideLang(); } else { closeAllPops(); showLang(); } });
    document.addEventListener('click', function (e) {
      if (e.target.closest('header')) return;
      closeAllPops(); syncNavLock();
    });
    /* 首屏工具按钮:语言/外观/二维码(在开启页也能切换) */
    var mDlLangBtn = $('#mDlLang'), mDlLookBtn = $('#mDlLook'), mDlQrBtn = $('#mDlQr');
    if (mDlLangBtn) mDlLangBtn.addEventListener('click', function (e) { e.stopPropagation(); closeAllPops(); showLang(mDlLangBtn); });
    if (mDlLookBtn) mDlLookBtn.addEventListener('click', function (e) { e.stopPropagation(); closeAllPops(); showLook(mDlLookBtn); });
    if (mDlQrBtn) mDlQrBtn.addEventListener('click', function (e) { e.stopPropagation(); closeAllPops(); showQr(mDlQrBtn); });
    /* 部分移动 WebView 会吞 click,改用 touchstart 打开(阻止默认行为防双触发) */
    if ('ontouchstart' in window) {
      [
        { btn: 'qrBtn', pop: 'qrPop', open: showQr, close: hideQrPop },
        { btn: 'lookBtn', pop: 'lookPop', open: showLook, close: hideLookPop },
        { btn: 'langBtn', pop: 'langPop', open: showLang, close: hideLang }
      ].forEach(function (item) {
        var btnEl = $(item.btn), popEl = $(item.pop);
        if (!btnEl) return;
        btnEl.addEventListener('touchstart', function (e) {
          e.preventDefault(); e.stopPropagation();
          if (popEl.classList.contains('show')) item.close();
          else { closeAllPops(); item.open(); }
        }, { passive: false });
      });
      [
        { btn: 'mDlLang', open: showLang, anchor: mDlLangBtn },
        { btn: 'mDlLook', open: showLook, anchor: mDlLookBtn },
        { btn: 'mDlQr', open: showQr, anchor: mDlQrBtn }
      ].forEach(function (item) {
        var btnEl = $(item.btn);
        if (!btnEl) return;
        btnEl.addEventListener('touchstart', function (e) {
          e.preventDefault(); e.stopPropagation();
          closeAllPops(); item.open(item.anchor);
        }, { passive: false });
      });
    }
  }
  $$('.qr-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var q = tab.dataset.q;
      $$('.qr-tab').forEach(function (x) { x.classList.toggle('active', x === tab); });
      $$('.qr-pane').forEach(function (p) { p.classList.toggle('show', p.dataset.q === q); });
      var imgs = $('#qrImgs');
      var ap = $('.qr-pane.show');
      if (imgs && ap) imgs.style.height = ap.offsetHeight + 'px';
    });
  });
  function showLang(btn) {
    if (!isMobileUA && otherPopOpen('.lang-pop.show')) return;
    clearTimeout(langTimer);
    if(themePop) themePop.classList.remove('show'); clearTimeout(popTimer);
    if(qqPop) qqPop.classList.remove('show'); clearTimeout(qqTimer);
    if(mPop) mPop.classList.remove('show'); clearTimeout(mTimer);
    if(lookPop) lookPop.classList.remove('show'); clearTimeout(lookTimer);
    if(qrPop) qrPop.classList.remove('show'); clearTimeout(qrTimer); clearTimeout(qrAutoT);
    if(langPop && btn) posPop(langPop, btn); else if(langPop && langBtn) posPop(langPop, langBtn); if(langPop) langPop.classList.add('show'); unlockBtnId = 'langBtn'; syncNavLock();
  }
  function hideLang() { langTimer = setTimeout(function () { if(langPop) langPop.classList.remove('show'); unlockBtnId = null; syncPopOpen(); syncNavLock(); }, 250); }
  var langOpenT = null;
  if (langBtn && langPop) {
    langBtn.addEventListener('mouseenter', function () { if (!hoverPop) return; clearTimeout(langOpenT); langOpenT = setTimeout(showLang, 300); });
    langBtn.addEventListener('mouseleave', function () { if (!hoverPop) return; clearTimeout(langOpenT); hideLang(); });
    langPop.addEventListener('mouseenter', function () { if (!hoverPop) return; showLang(); });
    langPop.addEventListener('mouseleave', function () { if (!hoverPop) return; hideLang(); });
  }
  $$('.lang-item').forEach(function (it) {
    it.addEventListener('click', function () {
      curLang = it.dataset.lang;
      try { localStorage.setItem('knexpanse-lang', curLang); } catch (e) {}
      applyLang();
      it.classList.add('popped');
      setTimeout(function () { it.classList.remove('popped'); }, 320);
      setTimeout(function () { langPop.classList.remove('show'); unlockBtnId = null; syncPopOpen(); syncNavLock(); }, 180);
    });
  });

  /* ---------- 用户头像/登录(导航栏最右侧,与编辑器下载页一致) ---------- */
  var adAvatarBtn = $('#adAvatarBtn'), adAvatarPop = $('#adAvatarPop'), adAvatarT = null;
  function showAdAvatar(btn) {
    if (!isMobileUA && otherPopOpen('.look-pop.show')) return;
    clearTimeout(adAvatarT);
    if(langPop) langPop.classList.remove('show'); clearTimeout(langTimer);
    if(qrPop) qrPop.classList.remove('show'); clearTimeout(qrTimer); clearTimeout(qrAutoT);
    if(adAvatarPop && btn) posPop(adAvatarPop, btn); else if(adAvatarPop && adAvatarBtn) posPop(adAvatarPop, adAvatarBtn);
    if(adAvatarPop) adAvatarPop.classList.add('show');
    unlockBtnId = 'adAvatarBtn'; syncNavLock();
  }
  function hideAdAvatar() { adAvatarT = setTimeout(function () { if(adAvatarPop) adAvatarPop.classList.remove('show'); unlockBtnId = null; syncPopOpen(); syncNavLock(); }, 250); }
  if (adAvatarBtn && adAvatarPop) {
    adAvatarBtn.addEventListener('mouseenter', function () { if (!hoverPop) return; clearTimeout(adAvatarT); adAvatarT = setTimeout(function () { showAdAvatar(); }, 300); });
    adAvatarBtn.addEventListener('mouseleave', function () { if (!hoverPop) return; hideAdAvatar(); });
    adAvatarPop.addEventListener('mouseenter', function () { if (!hoverPop) return; showAdAvatar(); });
    adAvatarPop.addEventListener('mouseleave', function () { if (!hoverPop) return; hideAdAvatar(); });
    adAvatarBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (adAvatarPop.classList.contains('show')) { clearTimeout(adAvatarT); adAvatarPop.classList.remove('show'); unlockBtnId = null; syncNavLock(); }
      else showAdAvatar();
    });
    /* 点击页面空白处关闭头像弹窗(悬浮窗内部点击除外) */
    document.addEventListener('click', function (e) {
      if (e.target.closest('header')) return;
      if (e.target.closest('.qr-pop, .lang-pop, .look-pop, .qq-pop, .m-pop')) return;
      if (adAvatarPop.classList.contains('show')) { adAvatarPop.classList.remove('show'); unlockBtnId = null; syncNavLock(); }
    });
  }
  /* 登录态探测:已登录换头像/昵称,未登录点击直达 /login */
  (function () {
    var b = document.getElementById('adAvatarBtn');
    var fbHtml = b ? b.innerHTML : '';
    function useFallback() { if (b) b.innerHTML = fbHtml; }
    if (typeof fetch !== 'function' || !b) return;
    fetch('/api/user/current?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .catch(function () { return { logged_in: false }; })
      .then(function (data) {
        if (data && data.logged_in) {
          var u = data.username || 'me';
          var av = data.avatar || (data.qq ? 'https://q1.qlogo.cn/g?b=qq&nk=' + data.qq + '&s=100' : '');
          var t = document.getElementById('adAvatarName');
          if (t) t.textContent = (data.nickname || u);
          var home = document.getElementById('adAvatarHome');
          if (home) home.setAttribute('onclick', "location.href='/u/" + encodeURIComponent(u) + "'");
          if (av) {
            var img = document.createElement('img');
            img.alt = '头像';
            img.onerror = useFallback;
            img.src = av;
            b.innerHTML = '';
            b.appendChild(img);
          }
        } else {
          b.addEventListener('click', function (e) { e.stopPropagation(); location.href = '/login'; });
        }
      });
  })();

  var parallaxLayers = $$('.parallax');
  var bgLayer = $('#bgLayer');
  var pTick = false;
  function updateParallax() {
    var y = window.scrollY;
    parallaxLayers.forEach(function (w) { w.style.transform = 'translateY(' + (y * parseFloat(w.dataset.speed)).toFixed(1) + 'px)'; });
    if (typeof particlesBox !== 'undefined' && particlesBox) particlesBox.style.transform = 'translateY(' + (y * -0.05).toFixed(1) + 'px)';
    pTick = false;
  }
  window.addEventListener('scroll', function () { if (!pTick) { requestAnimationFrame(updateParallax); pTick = true; } }, { passive: true });
  if (!('ontouchstart' in window)) {
    var bgTick = false;
    document.addEventListener('mousemove', function (e) {
      var mx = (e.clientX / window.innerWidth - 0.5) * 2;
      var my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!bgTick) {
        requestAnimationFrame(function () {
          bgLayer.style.marginLeft = (mx * -8) + 'px';
          bgLayer.style.marginTop = (my * -8) + 'px';
          bgTick = false;
        });
        bgTick = true;
      }
    }, { passive: true });
  }

  var glow = $('#cursorGlow');
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) { glow.style.display = 'none'; }
  else {
    document.addEventListener('mousemove', function (e) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; }, { passive: true });
    document.addEventListener('mouseleave', function () { glow.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { glow.style.opacity = '1'; });
  }

  /* ---------- 全局悬浮 ---------- */
  function bindTilt(el, maxDeg) {
    if (/Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MQQBrowser/i.test(navigator.userAgent)) return;
    /* rAF 节流:每帧最多读取一次布局(几何会随滚动变化,不缓存) */
    var pending = false;
    el.addEventListener('mousemove', function (e) {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        var r = el.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -maxDeg;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * maxDeg;
        el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      });
    }, { passive: true });
    el.addEventListener('mouseleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }, { passive: true });
  }
  /* 始终绑定 tilt(节能模式下由 CSS 强制压住,开头卡片除外),切回标准模式立即生效 */
  $$('.card').forEach(function (c) { bindTilt(c, 16); });
  $$('.btn').forEach(function (b) { bindTilt(b, 10); });

  /* ---------- 涟漪 ---------- */
  $$('.btn, .icon-btn, .ft-tab, .carousel-dots button, .tp-item, .dl-col, .ext-install').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 700);
    });
  });

  /* ---------- 滚动入场(每次回视口重播,延迟移除防边缘抽搐) ---------- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        clearTimeout(en.target._rt);
        en.target.classList.add('in');
      } else {
        clearTimeout(en.target._rt);
        en.target._rt = setTimeout(function () { en.target.classList.remove('in'); }, 420);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -3% 0px' });
  $$('.reveal').forEach(function (el) { revealObs.observe(el); });

  /* ---------- 插件 API 接入(列表 /app/api/knmk?page=1;失败自动降级为内置示例) ---------- */
  var MARKET_BASE = 'https://code.pgrm.run'; /* 后端已开 CORS(*),本地/线上均可直接取数 */
  var MARKET_URL = MARKET_BASE + '/mk/kn';
  var PLUGINS = [];
  var EXT_ICONS = [
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15c-1.6-2.1-2.2-4.6-1.7-7.1 2.6-.4 5.2.2 7.3 1.7-.4 2.6-1.1 4.8-2.6 6.2"/><path d="M9.3 12.8c-3.1 1.6-4.6 3.6-5.1 7.1 3.5-.5 5.6-2 7.2-5.1"/><circle cx="14.7" cy="9.3" r="1.2" fill="currentColor" stroke="none"/></svg>',
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>',
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>'
  ];
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* 插件名/标签多语言映射(API 返回中文,语言切换时实时翻译) */
  var PLUGIN_L10N = {
    '帧率统计器': { zh: '帧率统计器', tw: '幀率統計器', en: 'FPS Monitor', ja: 'FPSモニター', ko: 'FPS 모니터', es: 'Monitor de FPS' },
    'MDUI': { zh: 'MDUI', tw: 'MDUI', en: 'MDUI', ja: 'MDUI', ko: 'MDUI', es: 'MDUI' },
    '源码云空间': { zh: '源码云空间', tw: '源碼雲空間', en: 'Source Cloud', ja: 'ソースクラウド', ko: '소스 클라우드', es: 'Nube de Código' }
  };
  var TAG_L10N = {
    '官方': { zh: '官方', tw: '官方', en: 'Official', ja: '公式', ko: '공식', es: 'Oficial' },
    '数据存储': { zh: '数据存储', tw: '數據存儲', en: 'Data Storage', ja: 'データ保存', ko: '데이터 저장', es: 'Almacenamiento' },
    '工具': { zh: '工具', tw: '工具', en: 'Tools', ja: 'ツール', ko: '도구', es: 'Herramientas' },
    '美化': { zh: '美化', tw: '美化', en: 'Beautify', ja: '美化', ko: '꾸미기', es: 'Estética' },
    '效率': { zh: '效率', tw: '效率', en: 'Utility', ja: '効率', ko: '효율', es: 'Utilidad' },
    '游戏': { zh: '游戏', tw: '遊戲', en: 'Games', ja: 'ゲーム', ko: '게임', es: 'Juegos' },
    '动画': { zh: '动画', tw: '動畫', en: 'Animation', ja: 'アニメ', ko: '애니메이션', es: 'Animación' },
    '主题': { zh: '主题', tw: '主題', en: 'Theme', ja: 'テーマ', ko: '테마', es: 'Tema' },
    '开发': { zh: '开发', tw: '開發', en: 'Dev Tools', ja: '開発', ko: '개발', es: 'Desarrollo' },
    '编辑器': { zh: '编辑器', tw: '編輯器', en: 'Editor', ja: 'エディタ', ko: '에디터', es: 'Editor' },
    '文本': { zh: '文本', tw: '文本', en: 'Text', ja: 'テキスト', ko: '텍스트', es: 'Texto' },
    '图片': { zh: '图片', tw: '圖片', en: 'Image', ja: '画像', ko: '이미지', es: 'Imagen' },
    '音乐': { zh: '音乐', tw: '音樂', en: 'Music', ja: '音楽', ko: '음악', es: 'Música' },
    '教育': { zh: '教育', tw: '教育', en: 'Education', ja: '教育', ko: '교육', es: 'Educación' },
    '娱乐': { zh: '娱乐', tw: '娛樂', en: 'Entertainment', ja: '娯楽', ko: '오락', es: 'Entretenimiento' },
    '其他': { zh: '其他', tw: '其他', en: 'Other', ja: 'その他', ko: '기타', es: 'Otros' }
  };
  function l10nName(name) {
    var m = PLUGIN_L10N[name];
    return (m && m[curLang]) ? m[curLang] : name;
  }
  function l10nTag(tag) {
    var m = TAG_L10N[tag];
    return (m && m[curLang]) ? m[curLang] : tag;
  }
  /* 统一 GET 请求:fetch 优先(有 AbortController 则 4s 超时;没有则直接请求),fetch 不可用回退 XMLHttpRequest */
  function apiGet(url) {
    return new Promise(function (resolve, reject) {
      try {
        if (window.fetch) {
          var opts = {}, ctrl = null, timer = null;
          if (window.AbortController) { ctrl = new AbortController(); opts.signal = ctrl.signal; }
          timer = setTimeout(function () { if (ctrl) ctrl.abort(); reject(new Error('timeout')); }, 4000);
          window.fetch(url, opts).then(function (r) {
            clearTimeout(timer);
            if (!r.ok) { reject(new Error('HTTP ' + r.status)); return; }
            resolve(r);
          }, function (e) { clearTimeout(timer); reject(e); });
        } else if (window.XMLHttpRequest) {
          var xhr = new window.XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.timeout = 4000;
          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({ json: function () { return JSON.parse(xhr.responseText); }, text: function () { return xhr.responseText; } });
            } else { reject(new Error('HTTP ' + xhr.status)); }
          };
          xhr.onerror = function () { reject(new Error('network')); };
          xhr.ontimeout = function () { reject(new Error('timeout')); };
          xhr.send();
        } else { reject(new Error('no-request')); }
      } catch (e) { reject(e); }
    });
  }
  /* ---------- 占位提示 ---------- */
  function toast(msg) {
    document.querySelectorAll('[data-toast]').forEach(function (old) {
      old.style.opacity = '0';
      old.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(function () { old.remove(); }, 240);
    });
    var t = document.createElement('div');
    t.setAttribute('data-toast', '1');
    t.className = 'toast';
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:34px;transform:translateX(-50%);background:var(--glass-strong);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--text-1);padding:11px 22px;border-radius:30px;font-size:14px;box-shadow:var(--shadow),inset 0 1px 0 var(--glass-hi-top);z-index:9999;opacity:0;transition:opacity .3s,transform .3s;';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(-8px)'; });
    setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateX(-50%)';
      setTimeout(function () { t.remove(); }, 350);
    }, 2200);
  }
  /* ---------- 插件:加载 + 排序 + 搜索 + 分页 ---------- */
  var PER_PAGE = 12;
  var allPlugins = [];
  var filteredPlugins = [];
  var curPage = 1;
  var curQuery = '';
  var curSort = 'latest';
  var curFilter = 'all';

  function loadMarket() {
    /* 接口 search 参数不过滤,循环拉取全部页,本地过滤 */
    var page = 1;
    var totalPages = 1;
    console.log('[Market] 开始加载插件列表, URL:', MARKET_BASE + '/app/api/knmk?page=' + page);
    function fetchPage() {
      console.log('[Market] 正在请求:', MARKET_BASE + '/app/api/knmk?page=' + page);
      return apiGet(MARKET_BASE + '/app/api/knmk?page=' + page)
        .then(function (r) { 
          console.log('[Market] 请求成功, 状态码:', r.status || 'N/A');
          return r.json(); 
        })
        .then(function (data) {
          console.log('[Market] 收到数据, 插件数量:', data.plugins ? data.plugins.length : 0, ', 总页数:', data.total_pages);
          if (data && data.plugins && data.plugins.length) allPlugins = allPlugins.concat(data.plugins);
          if (data && data.total_pages > totalPages) totalPages = data.total_pages;
          if (page < totalPages) { page++; return fetchPage(); }
        })
        .catch(function (err) {
          console.error('[Market] 请求失败:', err);
        });
    }
    fetchPage()
      .then(function () { buildFilterMenu(); renderMarket(); })
      .catch(function () { buildFilterMenu(); renderMarket(); /* 接口不可用时显示空态 */ });
  }

  /* 排序:仅使用 API 提供的字段(id=最新,rating=评分) */
  function sortPlugins(list) {
    var arr = list.slice();
    switch (curSort) {
      case 'top': /* 评分最高 */
        arr.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
        break;
      case 'all': /* 全部:保持接口顺序 */
        break;
      default: /* 最新:按 id 倒序 */
        arr.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
    }
    return arr;
  }

  /* 筛选菜单:从已加载插件的标签动态生成 */
  function buildFilterMenu() {
    var menu = $('#mkFilterMenu');
    if (!menu) return;
    var tagSet = [];
    allPlugins.forEach(function (p) {
      (p.tags || []).forEach(function (t) {
        if (tagSet.indexOf(t) < 0) tagSet.push(t);
      });
    });
    var html = '<button class="mk-menu-item cur" data-filter="all" type="button"><i class="mdui-icon material-icons">apps</i><span>' + (I18N.mk_all ? I18N.mk_all[curLang] : '全部') + '</span></button>';
    tagSet.forEach(function (t) {
      html += '<button class="mk-menu-item" data-filter="' + escHtml(t) + '" type="button"><i class="mdui-icon material-icons">tag</i><span>' + escHtml(l10nTag(t)) + '</span></button>';
    });
    menu.innerHTML = html;
    /* 绑定筛选项 */
    $$('.mk-menu-item[data-filter]', menu).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter');
        curFilter = f;
        $$('.mk-menu-item[data-filter]', menu).forEach(function (x) { x.classList.toggle('cur', x === b); });
        var lbl = $('#mkFilterLabel');
        if (lbl) { var _sp = b.querySelector('span'); lbl.textContent = _sp ? _sp.textContent : b.textContent; }
        closeMkMenus();
        curPage = 1;
        renderMarket();
      });
    });
  }

  function applyMarketFilter() {
    var q = (curQuery || '').trim().toLowerCase();
    filteredPlugins = allPlugins.filter(function (p) {
      if (q) {
        var name = (p.name || '').toLowerCase();
        var author = (p.author || '').toLowerCase();
        var tags = (p.tags || []).join(' ').toLowerCase();
        if (name.indexOf(q) < 0 && author.indexOf(q) < 0 && tags.indexOf(q) < 0) return false;
      }
      if (curFilter !== 'all') {
        if ((p.tags || []).indexOf(curFilter) < 0) return false;
      }
      return true;
    });
    filteredPlugins = sortPlugins(filteredPlugins);
  }

  function renderMarket() {
    var grid = $('#mkGrid');
    var empty = $('#mkEmpty');
    var pager = $('#mkPager');
    if (!grid) return;
    applyMarketFilter();
    var total = filteredPlugins.length;
    var totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (curPage > totalPages) curPage = totalPages;
    var start = (curPage - 1) * PER_PAGE;
    var pageItems = filteredPlugins.slice(start, start + PER_PAGE);

    if (!total) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      if (pager) pager.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';

    var cards = pageItems.map(function (p, i) {
      /* 后端没有的占位插件不展示(如历史遗留的 MDUI) */
      if (p.name === 'MDUI') return '';
      var tags = (p.tags || []).slice(0, 3).map(function (t) { return '<span class="mk-tag">' + escHtml(l10nTag(t)) + '</span>'; }).join('');
      var rating = (p.rating != null ? Number(p.rating).toFixed(1) : '5.0');
      var dlUrl = p.download_url ? (MARKET_BASE + p.download_url) : MARKET_URL;
      /* 封面:统一 1:1,接入后端 icon_url;无封面/加载失败 → "图片未找到"占位 */
      var coverInner = p.icon_url
        ? '<img src="' + escHtml(p.icon_url) + '" alt="" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'mk-cover-miss\');this.parentNode.innerHTML=\'<span class=&quot;mk-cover-ph-txt&quot;>' + (I18N.mk_no_cover ? I18N.mk_no_cover[curLang] : '图片未找到') + '</span>\'">'
        : '';
      var coverHtml = '<div class="mk-cover' + (p.icon_url ? '' : ' mk-cover-miss') + '">' + coverInner + (p.icon_url ? '' : '<span class="mk-cover-ph-txt">' + (I18N.mk_no_cover ? I18N.mk_no_cover[curLang] : '图片未找到') + '</span>') + '</div>';
      var stats = '<div class="mk-stats">' +
        '<span><i class="mdui-icon material-icons">visibility</i>' + (p.view_count || 0) + '</span>' +
        '<span><i class="mdui-icon material-icons">favorite</i>' + (p.like_count || 0) + '</span>' +
        '<span><i class="mdui-icon material-icons">paid</i>' + (p.coin_count || 0) + '</span>' +
        '<span><i class="mdui-icon material-icons">download</i>' + (p.download_count || 0) + '</span>' +
        '</div>';
      return '<div class="mk-card card mk-has-cover" data-id="' + escHtml(p.id) + '">' +
        '<i class="mk-edge" aria-hidden="true"></i>' +
        coverHtml +
        '<div class="mk-body" style="width:100%">' +
        '<h3>' + escHtml(l10nName(p.name)) + '</h3>' +
        '<p class="mk-author">by @' + escHtml(p.author) + '</p>' +
        '<div class="mk-tags">' + tags + '</div>' +
        stats +
        '<div class="mk-foot">' +
        '<span class="mk-actions">' +
        '<span class="mk-rate">★ ' + rating + '</span>' +
        '<a class="mk-dl" href="' + dlUrl + '" rel="noopener"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg><span>' + (I18N.mk_dl ? I18N.mk_dl[curLang] : '下载') + '</span></a>' +
        '<button class="mk-view" data-id="' + escHtml(p.id) + '"><i class="mdui-icon material-icons">visibility</i><span>' + (I18N.ext_view ? I18N.ext_view[curLang] : '查看') + '</span></button>' +
        '</span></div>' +
        '</div></div>';
    }).join('');
    /* 换页过渡:旧卡淡出 → 换新卡淡入 */
    var swap = function () {
      grid.classList.remove('mk-leaving', 'mk-render');
      void grid.offsetWidth;
      grid.innerHTML = cards;
      var mkCards = grid.querySelectorAll('.mk-card');
      for (var mi = 0; mi < mkCards.length; mi++) { bindCardEvents(mkCards[mi]); }
      grid.classList.add('mk-render');
    };
    if (grid.children.length) {
      if (grid._leaveT) { clearTimeout(grid._leaveT); grid.classList.remove('mk-leaving'); }
      grid.classList.add('mk-leaving');
      /* 全部卡片同时消失(无逐个延迟),结束才换新页 */
      grid._leaveT = setTimeout(function () { grid._leaveT = null; grid.classList.remove('mk-leaving'); swap(); }, 280);
    } else {
      swap();
    }

    if (pager) {
      pager.style.display = totalPages > 1 ? 'flex' : 'none';
      var info = $('#mkInfo');
      if (info) info.textContent = curPage + ' / ' + totalPages;
      var prev = $('#mkPrev'), next = $('#mkNext');
      if (prev) prev.disabled = curPage <= 1;
      if (next) next.disabled = curPage >= totalPages;
    }

    /* 单张卡片的事件绑定(在 swap 换入新卡后逐卡调用) */
    function bindCardEvents(c) {
      c.addEventListener('click', function () {
        var id = c.getAttribute('data-id');
        if (id != null) location.href = MARKET_BASE + '/mk/kn/plugin/' + encodeURIComponent(id);
        else location.href = MARKET_URL;
      });
      var view = c.querySelector('.mk-view');
      if (view) view.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = view.getAttribute('data-id') || c.getAttribute('data-id');
        if (id != null) location.href = MARKET_BASE + '/mk/kn/plugin/' + encodeURIComponent(id);
        else location.href = MARKET_URL;
      });
    }
  }

  var mkInput = $('#mkInput');
  if (mkInput) {
    var mkDebounce = null;
    mkInput.addEventListener('input', function () {
      clearTimeout(mkDebounce);
      var v = this.value;
      mkDebounce = setTimeout(function () { curQuery = v; curPage = 1; renderMarket(); }, 200);
    });
    var mkSearchBox = $('.mk-search'), mkDrawT = null;
    mkInput.addEventListener('focus', function () {
      clearTimeout(mkDrawT);
      if (mkSearchBox) { mkSearchBox.classList.remove('blurring'); mkSearchBox.classList.add('focused'); }
    });
    mkInput.addEventListener('blur', function () {
      if (mkSearchBox) { mkSearchBox.classList.remove('focused'); mkSearchBox.classList.add('blurring'); }
      clearTimeout(mkDrawT);
      mkDrawT = setTimeout(function () { if (mkSearchBox) mkSearchBox.classList.remove('blurring'); }, 1200);
    });
  }
  var mkPrev = $('#mkPrev'), mkNext = $('#mkNext');
  if (mkPrev) mkPrev.addEventListener('click', function () { if (curPage > 1) { curPage--; renderMarket(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  if (mkNext) mkNext.addEventListener('click', function () { var tp = Math.max(1, Math.ceil(filteredPlugins.length / PER_PAGE)); if (curPage < tp) { curPage++; renderMarket(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  /* 排序/筛选 二级菜单交互 */
  var mkSortBtn = $('#mkSortBtn'), mkSortMenu = $('#mkSortMenu');
  var mkFilterBtn = $('#mkFilterBtn'), mkFilterMenu = $('#mkFilterMenu');
  function closeMkMenus() {
    [mkSortMenu, mkFilterMenu].forEach(function (m) { if (m) m.classList.remove('show'); });
    if (mkSortBtn) mkSortBtn.setAttribute('aria-expanded', 'false');
    if (mkFilterBtn) mkFilterBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleMkMenu(btn, menu) {
    if (!btn || !menu) return;
    var willOpen = !menu.classList.contains('show');
    closeMkMenus();
    if (willOpen) {
      menu.classList.add('show');
      btn.setAttribute('aria-expanded', 'true');
    }
  }
  if (mkSortBtn) mkSortBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMkMenu(mkSortBtn, mkSortMenu); });
  if (mkFilterBtn) mkFilterBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMkMenu(mkFilterBtn, mkFilterMenu); });
  /* 排序菜单项 */
  $$('.mk-menu-item[data-sort]', mkSortMenu).forEach(function (b) {
    b.addEventListener('click', function () {
      var s = b.getAttribute('data-sort');
      curSort = s;
      $$('.mk-menu-item[data-sort]', mkSortMenu).forEach(function (x) { x.classList.toggle('cur', x === b); });
      var lbl = $('#mkSortLabel');
      if (lbl) { var _sp = b.querySelector('span'); lbl.textContent = _sp ? _sp.textContent : b.textContent; }
      closeMkMenus();
      curPage = 1;
      renderMarket();
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.mk-pop-wrap')) closeMkMenus();
  });
  /* ---------- 插件网格联动倾斜 + 鼠标光感(邻居卡跟随鼠标方向轻微倾斜) ---------- */
  var mkGridEl = $('#mkGrid');
  var mkExtraEls = $$('.mk-search');
  if (mkGridEl) {
    var mkPending = false, mkMX = -9999, mkMY = -9999;
    function mkTiltFrame() {
      mkPending = false;
      var cards = mkGridEl.querySelectorAll('.mk-card');
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i], r = c.getBoundingClientRect();
        if (r.width === 0) continue;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = mkMX - cx, dy = mkMY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var hover = mkMX >= r.left && mkMX <= r.right && mkMY >= r.top && mkMY <= r.bottom;
        var maxD = hover ? 12 : 8;
        var fall = hover ? 1 : Math.max(0, 1 - dist / 780);
        var rx = (-dy / (hover ? r.height / 2 : 340)) * maxD * fall;
        var ry = (dx / (hover ? r.width / 2 : 340)) * maxD * fall;
        rx = Math.max(-maxD, Math.min(maxD, rx));
        ry = Math.max(-maxD, Math.min(maxD, ry));
        c.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        c.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        /* 光映射到所有卡(含邻居):光斑位置换算到各卡自身坐标 */
        c.style.setProperty('--mx', (((mkMX - r.left) / r.width) * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (((mkMY - r.top) / r.height) * 100).toFixed(1) + '%');
        c.classList.toggle('mk-glow', hover);
        c.classList.toggle('mk-glow-soft', !hover && fall > 0.04);
      }
    }
    mkGridEl.addEventListener('mousemove', function (e) {
      mkMX = e.clientX; mkMY = e.clientY;
      if (!mkPending) { mkPending = true; requestAnimationFrame(mkTiltFrame); }
    }, { passive: true });
    mkGridEl.addEventListener('mouseleave', function () {
      var cards = mkGridEl.querySelectorAll('.mk-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].style.setProperty('--rx', '0deg');
        cards[i].style.setProperty('--ry', '0deg');
        cards[i].classList.remove('mk-glow');
        cards[i].classList.remove('mk-glow-soft');
      }
    });
    /* 搜索框/最新/筛选:光斑+边缘光映射(不倾斜;搜索框在 hero 区,挂 document) */
    document.addEventListener('mousemove', function (e) {
      var els = mkExtraEls;
      for (var i = 0; i < els.length; i++) {
        var el = els[i], r = el.getBoundingClientRect();
        if (!r.width) continue;
        var hover = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
        el.classList.toggle('mk-glow', hover);
      }
    }, { passive: true });
  }


  loadMarket();
  /* ---------- 启动 ---------- */
  /* 预加载全部主题资源,切换时即时显示 */
  try {
    [LOGO_DEFAULT, ASSETS.ocean.logo, ASSETS.amber.logo, ASSETS.ocean.term, ASSETS.amber.term].forEach(function (u) {
      var im = new Image();
      im.src = u;
    });
  } catch (e) {}
  /* 主题统一由 #themeBtn 双主题系统处理,不再调用旧三主题 applyTheme */

  function closeAllPops(){ [qrPop, lookPop, langPop, themePop, qqPop, mPop, adAvatarPop].forEach(function(p){ if(p && p.classList.contains('show')) p.classList.remove('show'); }); try{unlockBtnId=null;}catch(e){} }
})();
/* 全站统一:通用 .card(非 mk-card) 联动倾斜 + 鼠标光斑/边缘高光映射至所有卡牌
   - 悬停卡 11° 倾斜,周围卡按距离衰减倾斜(解决"邻居不倾斜")
   - --mx/--my 写入所有卡,光斑随光标映射(解决"光不映射其它卡")
   - 边缘厚度 --edge-w 随卡尺寸收敛(解决"小卡反光过大")
   - 读写分离 + .tilting 即时变形,消除大卡倾斜卡顿 */
(function () {
  var SEL = '.card:not(.mk-card)';
  var cards = [], rects = [], mx = -9999, my = -9999, raf = false, hover = null;

  function ensure(c) {
    if (c.__spot) return;
    c.__spot = 1;
    var d = document.createElement('div');
    d.className = 'card-spot';
    c.appendChild(d);
    var w = c.getBoundingClientRect().width || 240;
    var ew = Math.max(1, Math.min(3, w * 0.012));
    c.style.setProperty('--edge-w', ew.toFixed(2) + 'px');
      if (w > 460) c.classList.add('card-lg');
  }
  function collect() {
    cards = Array.prototype.slice.call(document.querySelectorAll(SEL));
    for (var i = 0; i < cards.length; i++) ensure(cards[i]);
  }
  function frame() {
    raf = false;
    if (!cards.length) return;
    for (var i = 0; i < cards.length; i++) rects[i] = cards[i].getBoundingClientRect();
    hover = null;
    for (var i = 0; i < cards.length; i++) {
      var r = rects[i];
      if (!r.width) continue;
      if (mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom) { hover = cards[i]; break; }
    }
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], r = rects[i];
      if (!r.width) continue;
      var isHover = (c === hover);
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = mx - cx, dy = my - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var fall = isHover ? 1 : Math.max(0, 1 - dist / 760);
      /* 光斑位置:所有卡都跟随光标(大卡也保留发光) */
      c.style.setProperty('--mx', (((mx - r.left) / r.width) * 100).toFixed(1) + '%');
      c.style.setProperty('--my', (((my - r.top) / r.height) * 100).toFixed(1) + '%');
      /* 大卡(>460px):只发光不倾斜(倾斜由 CSS .card-lg{transform:none} 关掉,避免卡顿) */
      if (r.width > 460) {
        c.classList.add('card-lg');
        c.classList.remove('tilting');
        if (isHover) c.classList.add('spot-on'); else if (fall > 0.04) c.classList.add('spot-near'); else c.classList.remove('spot-on', 'spot-near');
        continue;
      }
      var maxD = isHover ? 11 : 6.5;
      var rx = (-dy / (isHover ? (r.height / 2) : 340)) * maxD * fall;
      var ry = (dx / (isHover ? (r.width / 2) : 340)) * maxD * fall;
      rx = Math.max(-maxD, Math.min(maxD, rx));
      ry = Math.max(-maxD, Math.min(maxD, ry));
      c.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      c.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      if (isHover) { c.classList.add('tilting', 'spot-on'); c.classList.remove('spot-near'); }
      else if (fall > 0.04) { c.classList.add('tilting', 'spot-near'); c.classList.remove('spot-on'); }
      else { c.classList.remove('tilting', 'spot-near', 'spot-on'); }
    }
  }
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    if (!cards.length) collect();
    if (!raf) { raf = true; requestAnimationFrame(frame); }
  }
  function init() {
    collect();
    document.addEventListener('mousemove', onMove, { passive: true });
    if (window.MutationObserver) {
      var t = 0;
      var mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(collect, 200); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

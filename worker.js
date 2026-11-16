// 호스트 이름으로 사이트를 나눕니다: contravincula.ftvot.studio 는 docs/contra-vincula/ 를 보여 줍니다
const GAME_HOST = 'contravincula.';
const GAME_DIR = '/contra-vincula';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith(GAME_HOST) && !url.pathname.startsWith(GAME_DIR + '/') && !url.pathname.startsWith('/assets/icons/')) {
      url.pathname = GAME_DIR + url.pathname;
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};

/**
 * Lecteur YouTube piloté par l'app (API IFrame dans une WebView).
 *
 * Objectif : qu'une vidéo YouTube se comporte comme une vidéo téléversée —
 * lecture muette automatique, pause hors écran / en arrière-plan / à la
 * demande, son au tap — sans jamais montrer l'interface YouTube (logo, titre,
 * écran d'erreur). Le poster de l'événement reste affiché tant que la vidéo ne
 * joue pas vraiment ; en cas d'erreur (vidéo non intégrable, erreur 153…), on
 * reste sur l'image et on prévient le parent.
 *
 * `preview` (accueil) : enchaîne quelques extraits courts de la vidéo, en muet
 * et en boucle, au lieu de la lire du début.
 *
 * La page hôte est servie avec l'origine de notre site (`baseUrl`) : YouTube
 * exige un Referer valide pour les lecteurs intégrés.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { WEB_BASE_URL } from '../../constants/urls';

/** Extraits de l'aperçu : positions (fraction de la durée) et longueur. */
const PREVIEW_POINTS = [0.15, 0.42, 0.68];
const PREVIEW_CLIP_SECONDS = 4;

export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.host.toLowerCase().replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (!/^youtube(-nocookie)?\.com$/.test(host)) return null;
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?#]+)/);
    return m ? m[2] : null;
  } catch {
    return null;
  }
}

function buildPlayerHtml(videoId: string, origin: string, preview: boolean): string {
  const id = JSON.stringify(videoId);
  const org = JSON.stringify(origin);
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
#wrap{position:absolute;inset:0;overflow:hidden}
#p{position:absolute;top:50%;left:50%;width:177.78vh;height:100vh;min-width:100vw;min-height:56.25vw;transform:translate(-50%,-50%);pointer-events:none}</style>
</head><body><div id="wrap"><div id="p"></div></div>
<script>
var post=function(m){try{window.ReactNativeWebView.postMessage(JSON.stringify(m))}catch(e){}};
var player=null,ready=false,preview=${preview ? 'true' : 'false'},want=false,seg=0,segEnd=0,timer=null;
var POINTS=${JSON.stringify(PREVIEW_POINTS)},CLIP=${PREVIEW_CLIP_SECONDS};
function startSeg(){var d=player.getDuration()||0;if(d<CLIP*3){player.seekTo(0,true);segEnd=d||1e9;return}
var t=Math.max(0,Math.min(d-CLIP-1,POINTS[seg%POINTS.length]*d));player.seekTo(t,true);segEnd=t+CLIP}
function tick(){if(!ready||!preview||!want)return;var c=player.getCurrentTime();if(c>=segEnd){seg++;startSeg()}}
window.__ez={
 play:function(){want=true;if(!ready)return;if(preview&&segEnd===0)startSeg();player.playVideo()},
 pause:function(){want=false;if(ready)player.pauseVideo()},
 mute:function(){if(ready)player.mute()},
 unmute:function(){if(ready){player.unMute();player.setVolume(100)}}
};
function onYouTubeIframeAPIReady(){player=new YT.Player('p',{host:'https://www.youtube-nocookie.com',videoId:${id},
 playerVars:{autoplay:0,mute:1,controls:0,disablekb:1,fs:0,iv_load_policy:3,modestbranding:1,playsinline:1,rel:0,origin:${org}},
 events:{onReady:function(){ready=true;player.mute();post({type:'ready'});if(want)window.__ez.play();timer=setInterval(tick,250)},
  onStateChange:function(e){if(e.data===1)post({type:'playing'});else if(e.data===2)post({type:'paused'});
   else if(e.data===0){if(preview){seg++;startSeg();player.playVideo()}else{player.seekTo(0,true);player.playVideo()}}},
  onError:function(e){post({type:'error',code:e.data})}}})}
</script><script src="https://www.youtube.com/iframe_api"></script></body></html>`;
}

interface Props {
  videoId: string;
  /** Doit jouer (même logique que la vidéo téléversée : visible, app active…). */
  playing: boolean;
  muted: boolean;
  /** Aperçu d'accueil : quelques extraits courts en boucle. */
  preview?: boolean;
  /** Poster affiché tant que la vidéo ne joue pas (et en cas d'erreur). */
  poster: React.ReactNode;
  onError?: () => void;
}

export default function YouTubeCoverPlayer({ videoId, playing, muted, preview = false, poster, onError }: Props) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // 1er choix : la page lecteur HÉBERGÉE sur notre site (vrai Referer, seule
  // solution fiable contre l'erreur 153 sur Android). Si elle n'est pas encore
  // déployée (404), repli sur la page locale avec baseUrl.
  const [useInline, setUseInline] = useState(false);
  const posterOpacity = useSharedValue(1);

  // Source mémorisée : un nouvel objet à chaque rendu rechargerait le lecteur.
  const source = useMemo(() => {
    const site = WEB_BASE_URL.replace(/\/+$/, '');
    if (!useInline) {
      return { uri: `${site}/embed/youtube.html?v=${encodeURIComponent(videoId)}&mode=${preview ? 'preview' : 'cover'}` };
    }
    return { html: buildPlayerHtml(videoId, site, preview), baseUrl: `${site}/` };
  }, [videoId, preview, useInline]);

  const fallbackToInline = () => {
    if (!useInline) {
      setReady(false);
      setUseInline(true);
    } else {
      setFailed(true);
      onError?.();
    }
  };

  const run = (js: string) => ref.current?.injectJavaScript(`window.__ez&&window.__ez.${js};true;`);

  useEffect(() => {
    if (!ready || failed) return;
    run(playing ? 'play()' : 'pause()');
    if (!playing) posterOpacity.value = withTiming(1, { duration: 160 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, ready, failed]);

  useEffect(() => {
    if (!ready || failed) return;
    run(muted ? 'mute()' : 'unmute()');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, ready, failed]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string } = {};
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'playing' && playing) posterOpacity.value = withTiming(0, { duration: 260 });
    else if (msg.type === 'error') {
      if (__DEV__) console.log(`[YouTube] erreur lecteur ${(msg as any).code} (${useInline ? 'page locale' : 'page hébergée'})`);
      posterOpacity.value = 1;
      // Erreur de configuration (Referer) sur la page locale uniquement : rien
      // à retenter. Sur la page hébergée, une 150/101 = vidéo non intégrable.
      setFailed(true);
      onError?.();
    }
  };

  const posterStyle = useAnimatedStyle(() => ({ opacity: posterOpacity.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {!failed && (
        <WebView
          ref={ref}
          source={source}
          originWhitelist={['*']}
          style={styles.web}
          onMessage={onMessage}
          onError={fallbackToInline}
          onHttpError={fallbackToInline}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={false}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
        />
      )}
      <Animated.View style={[StyleSheet.absoluteFill, posterStyle]}>{poster}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#000' },
});

(function () {
  const redirectDelay = 180;
  const currentScript = document.currentScript;
  let appBasePath = "/";

  if (currentScript) {
    try {
      const baseUrl = new URL("..", currentScript.src);
      appBasePath = baseUrl.pathname;
    } catch (error) {
      console.warn("Unable to determine app base path", error);
    }
  }

  function resolveHref(href) {
    if (!href) return null;

    const isProtocolRelative = href.startsWith("//");
    const isAbsoluteUrl = /^[a-z][a-z0-9+.-]*:/i.test(href);
    if (isAbsoluteUrl || isProtocolRelative) {
      return href;
    }

    if (href.startsWith("/")) {
      const normalizedBase = appBasePath.endsWith("/")
        ? appBasePath.slice(0, -1)
        : appBasePath;
      return `${normalizedBase}${href}`;
    }

    return href;
  }

  function safePlay(audio) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch (error) {
      console.warn("Audio playback unavailable", error);
    }
  }

  window.playSoundAndRedirect = function playSoundAndRedirect(audioId, href) {
    const audio = document.getElementById(audioId);
    safePlay(audio);
    const targetHref = resolveHref(href);
    if (targetHref) {
      let destination = targetHref;
      try {
        destination = new URL(targetHref, window.location.href).href;
      } catch (error) {
        console.warn("Falling back to raw href navigation", error);
      }
      window.setTimeout(() => {
        window.location.href = destination;
      }, redirectDelay);
    }
  };

  window.topFunction = function topFunction() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
})();

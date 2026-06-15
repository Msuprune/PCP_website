const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const safe = (fn) => { try { fn(); } catch (e) {} };
const TYPE_SPEED = 26;
const activeTypers = new Map();

function splitChars(el) {
  const text = el.dataset.tw != null ? el.dataset.tw : el.textContent;
  el.dataset.tw = text;
  el.textContent = "";
  const spans = [];
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) {
      el.appendChild(document.createTextNode(part));
      return;
    }
    const word = document.createElement("span");
    word.className = "tw-word";
    for (const ch of part) {
      const c = document.createElement("span");
      c.className = "tc";
      c.textContent = ch;
      word.appendChild(c);
      spans.push(c);
    }
    el.appendChild(word);
  });
  return spans;
}

function typeSpans(key, spans) {
  if (!spans.length) return;
  const prevTimer = activeTypers.get(key);
  if (prevTimer) clearInterval(prevTimer);
  let i = 0;
  let prev = null;
  let timer = null;
  const tick = () => {
    if (prev) prev.classList.remove("caret");
    if (i >= spans.length) {
      clearInterval(timer);
      activeTypers.delete(key);
      const last = spans[spans.length - 1];
      last.classList.add("caret");
      setTimeout(() => last.classList.remove("caret"), 1300);
      return;
    }
    const s = spans[i];
    s.classList.add("tc-on", "caret");
    prev = s;
    i += 1;
  };
  tick();
  timer = setInterval(tick, TYPE_SPEED);
  activeTypers.set(key, timer);
}

function typeElement(el) {
  el.dataset.risen = "1";
  let spans = Array.from(el.querySelectorAll(".tc"));
  if (!spans.length) spans = splitChars(el);
  typeSpans(el, spans);
}

document.addEventListener("langchange", () => {
  const run = () => {
    if (reduceMotion) return;
    const groups = new Map();
    document.querySelectorAll(".rise").forEach((el) => {
      delete el.dataset.tw;
      const key = el.closest("h1, h2, h3") || el;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    });
    groups.forEach((els, key) => {
      let spans = [];
      els.forEach((el) => { spans = spans.concat(splitChars(el)); });
      typeSpans(key, spans);
    });
    document.querySelectorAll(".rise-io").forEach((el) => {
      delete el.dataset.tw;
      const spans = splitChars(el);
      if (el.dataset.risen) typeSpans(el, spans);
    });
  };
  if (document.documentElement.classList.contains("booting")) {
    document.addEventListener("bootdone", run, { once: true });
  } else {
    run();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const booting = document.documentElement.classList.contains("booting");

  setTimeout(() => {
    if (!document.querySelector(".reveal.in, .stagger.in")) {
      document.querySelectorAll(".reveal, .stagger").forEach((el) => el.classList.add("in"));
      document.querySelectorAll(".tc").forEach((s) => s.classList.add("tc-on"));
      document.querySelectorAll(".tc.caret").forEach((s) => s.classList.remove("caret"));
    }
  }, booting ? 3600 : 1200);

  const ready = (fn) => {
    if (document.documentElement.classList.contains("booting")) {
      document.addEventListener("bootdone", fn, { once: true });
    } else {
      fn();
    }
  };

  safe(() => {
    const boot = document.getElementById("boot");
    if (!booting || !boot) return;
    const finish = () => {
      document.documentElement.classList.remove("booting");
      try { sessionStorage.setItem("pcp_boot", "1"); } catch (e) {}
    };
    if (reduceMotion) {
      finish();
      document.dispatchEvent(new Event("bootdone"));
      return;
    }
    const bar = document.getElementById("bootBar");
    const line = document.getElementById("bootLine");
    const msgs = ["INIT VISION CORE", "LOAD YOLOV8 WEIGHTS", "CALIBRATE COUNT LINES", "READY"];
    let p = 0;
    let mi = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 7 + Math.random() * 18);
      bar.style.width = p + "%";
      const stage = Math.floor((p / 100) * (msgs.length - 1));
      if (stage > mi) {
        mi = stage;
        line.textContent = msgs[mi];
      }
      if (p >= 100) {
        clearInterval(t);
        setTimeout(() => {
          boot.classList.add("done");
          document.dispatchEvent(new Event("bootdone"));
          setTimeout(finish, 750);
        }, 240);
      }
    }, 110);
  });

  safe(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || reduceMotion) return;
    const aim = document.getElementById("cursorAim");
    if (!aim) return;
    let started = false;
    document.addEventListener("mousemove", (e) => {
      aim.style.left = e.clientX + "px";
      aim.style.top = e.clientY + "px";
      if (!started) {
        started = true;
        document.body.classList.add("cursor-on");
      }
    });
    document.addEventListener("mouseover", (e) => {
      aim.classList.toggle("hov", Boolean(e.target.closest("a, button, summary, label, input, select, textarea")));
    });
    document.documentElement.addEventListener("mouseleave", () => aim.classList.add("hide"));
    document.documentElement.addEventListener("mouseenter", () => aim.classList.remove("hide"));
  });

  safe(() => {
    const nav = document.getElementById("nav");
    const navLinks = document.getElementById("navLinks");
    const progress = document.getElementById("progress");
    const scrubEls = reduceMotion ? [] : Array.from(document.querySelectorAll("[data-scrub]"));
    let lastY = 0;
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 10);
      nav.classList.toggle("hide", y > lastY && y > 180 && !navLinks.classList.contains("open"));
      document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px");
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
      if (scrubEls.length) {
        const vh = window.innerHeight;
        scrubEls.forEach((el) => {
          const r = el.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.72)));
          el.style.setProperty("--p", p.toFixed(3));
        });
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    window.addEventListener("resize", () => { document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px"); }, { passive: true });
    onScroll();
  });

  safe(() => {
    const nav = document.getElementById("nav");
    const burger = document.getElementById("burger");
    const navLinks = document.getElementById("navLinks");
    if (!burger || !navLinks) return;
    const setOpen = (open) => {
      burger.classList.toggle("open", open);
      navLinks.classList.toggle("open", open);
      if (nav) {
        nav.classList.toggle("menu-open", open);
        if (open) nav.classList.remove("hide");
      }
    };
    burger.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  });

  safe(() => {
    document.querySelectorAll(".stagger").forEach((container) => {
      Array.from(container.children).forEach((child, i) => child.style.setProperty("--i", i));
    });
  });

  safe(() => {
    if (reduceMotion) return;
    const skewEls = Array.from(document.querySelectorAll(".giant, .marquee"));
    if (!skewEls.length) return;
    let target = 0;
    let cur = 0;
    let raf = null;
    let lastSY = window.scrollY;
    const tick = () => {
      cur += (target - cur) * 0.14;
      target *= 0.85;
      skewEls.forEach((el) => { el.style.transform = "skewX(" + cur.toFixed(2) + "deg)"; });
      if (Math.abs(cur) > 0.03 || Math.abs(target) > 0.03) {
        raf = requestAnimationFrame(tick);
      } else {
        skewEls.forEach((el) => { el.style.transform = ""; });
        raf = null;
      }
    };
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      target = Math.max(-7, Math.min(7, (y - lastSY) * 0.4));
      lastSY = y;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  });

  safe(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });

  safe(() => {
    const clock = document.getElementById("clock");
    if (!clock) return;
    const fmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const tickClock = () => {
      if (document.visibilityState === "visible") clock.textContent = fmt.format(new Date());
    };
    tickClock();
    setInterval(tickClock, 1000);
  });

  safe(() => ready(() => {
    const dropDelay = (el, entry) => {
      if (entry.boundingClientRect.top >= window.innerHeight * 0.55) return;
      el.style.transitionDelay = "0s";
      if (el.classList.contains("stagger")) {
        Array.from(el.children).forEach((child) => { child.style.transitionDelay = "0s"; });
      }
    };

    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          dropDelay(entry.target, entry);
          entry.target.classList.add("in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px 12% 0px" });
    document.querySelectorAll(".reveal, .stagger").forEach((el) => revealIO.observe(el));

    const riseTargets = Array.from(document.querySelectorAll(".rise-io"));
    const checkRise = () => {
      if (reduceMotion || !riseTargets.length) return;
      const vh = window.innerHeight;
      for (let k = riseTargets.length - 1; k >= 0; k--) {
        const el = riseTargets[k];
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.85 && r.bottom > 0) {
          if (!el.dataset.risen) typeElement(el);
          riseTargets.splice(k, 1);
        }
      }
    };
    window.addEventListener("scroll", checkRise, { passive: true });
    window.addEventListener("resize", checkRise, { passive: true });
    checkRise();

    const nums = document.querySelectorAll(".num[data-target]");
    if (nums.length) {
      const numIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          numIO.unobserve(entry.target);
          const el = entry.target;
          const target = parseFloat(el.dataset.target);
          if (reduceMotion) { el.textContent = target; return; }
          const start = performance.now();
          const dur = 1400;
          const frame = (now) => {
            const t = Math.min(1, (now - start) / dur);
            el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
            if (t < 1) requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        });
      }, { threshold: 0.3 });
      nums.forEach((el) => numIO.observe(el));
    }

    const fills = document.querySelectorAll(".rm-fill[data-pct]");
    if (fills.length) {
      const fillIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          fillIO.unobserve(entry.target);
          const pct = entry.target.dataset.pct;
          if (reduceMotion) { entry.target.style.width = pct + "%"; return; }
          setTimeout(() => { entry.target.style.width = pct + "%"; }, 280);
        });
      }, { threshold: 0.25 });
      fills.forEach((el) => fillIO.observe(el));
    }
  }));

  safe(() => {
    document.querySelectorAll(".bento, .grid-4, .rm-grid").forEach((grid) => {
      grid.addEventListener("mousemove", (e) => {
        const card = e.target.closest(".card, .rm-card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  });

  safe(() => {
    if (reduceMotion) return;
    document.querySelectorAll(".bento .card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        card.style.transform = `perspective(800px) rotateY(${dx * 5}deg) rotateX(${-dy * 4}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  });

  safe(() => {
    if (reduceMotion) return;
    document.querySelectorAll(".btn-magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.24;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.24;
        btn.style.transition = "transform 0.1s ease-out";
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transition = "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)";
        btn.style.transform = "";
        setTimeout(() => { btn.style.transition = ""; }, 500);
      });
    });
  });

  safe(() => {
    if (reduceMotion) return;
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const wrap = document.createElement("div");
    wrap.className = "hero-particles";
    hero.insertAdjacentElement("afterbegin", wrap);
    for (let i = 0; i < 22; i++) {
      const sp = document.createElement("span");
      const x = (Math.random() * 100).toFixed(1);
      const y = (15 + Math.random() * 85).toFixed(1);
      const dur = (9 + Math.random() * 13).toFixed(1);
      const delay = (Math.random() * -22).toFixed(2);
      const size = (1 + Math.random() * 2.4).toFixed(1);
      sp.style.cssText = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s`;
      wrap.appendChild(sp);
    }
  });

  safe(() => {
    if (reduceMotion) return;
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const r = btn.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "btn-ripple";
        ripple.style.left = (e.clientX - r.left) + "px";
        ripple.style.top = (e.clientY - r.top) + "px";
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      });
    });
  });

  safe(() => {
    const carousel = document.getElementById("shotsCarousel");
    if (!carousel) return;
    const track = document.getElementById("carTrack");
    const real = track ? Array.from(track.children) : [];
    const prevBtn = document.getElementById("carPrev");
    const nextBtn = document.getElementById("carNext");
    const dotsWrap = document.getElementById("carDots");
    const figEl = document.getElementById("carFig");
    const capEl = document.getElementById("carCapText");
    const srcs = Array.from(carousel.querySelectorAll(".car-srcs span"));
    const vp = carousel.querySelector(".car-viewport");
    const n = real.length;

    const setCaption = (li) => {
      const frame = real[li] && real[li].querySelector(".shot-frame");
      if (figEl && frame) figEl.textContent = frame.dataset.fig || "";
      if (capEl && srcs[li]) capEl.textContent = srcs[li].textContent;
    };

    if (!track || !vp || n < 1) return;
    if (n < 2) { setCaption(0); return; }

    const firstClone = real[0].cloneNode(true);
    const lastClone = real[n - 1].cloneNode(true);
    firstClone.setAttribute("aria-hidden", "true");
    lastClone.setAttribute("aria-hidden", "true");
    track.insertBefore(lastClone, real[0]);
    track.appendChild(firstClone);

    const W = () => vp.clientWidth || 1;
    const logicalOf = (ti) => (((ti - 1) % n) + n) % n;
    let curTi = 1;

    const updateUI = (ti) => {
      const li = logicalOf(ti);
      dots.forEach((d, i) => d.classList.toggle("active", i === li));
      setCaption(li);
    };

    const dots = real.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "car-dot";
      b.setAttribute("aria-label", "Слайд " + (i + 1));
      b.addEventListener("click", () => goTo(i + 1, true));
      dotsWrap.appendChild(b);
      return b;
    });

    const goTo = (ti, smooth) => {
      curTi = ti;
      vp.scrollTo({ left: ti * W(), behavior: smooth ? "smooth" : "auto" });
      updateUI(ti);
    };

    prevBtn.addEventListener("click", () => goTo(curTi - 1, true));
    nextBtn.addEventListener("click", () => goTo(curTi + 1, true));

    let settleTimer = null;
    vp.addEventListener("scroll", () => {
      const ti = Math.round(vp.scrollLeft / W());
      if (ti >= 1 && ti <= n) updateUI(ti);
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const t = Math.round(vp.scrollLeft / W());
        if (t === 0) { curTi = n; vp.scrollTo({ left: n * W(), behavior: "auto" }); }
        else if (t === n + 1) { curTi = 1; vp.scrollTo({ left: W(), behavior: "auto" }); }
        else { curTi = t; }
        updateUI(curTi);
      }, 130);
    }, { passive: true });

    let hover = false;
    carousel.addEventListener("mouseenter", () => { hover = true; });
    carousel.addEventListener("mouseleave", () => { hover = false; });
    document.addEventListener("keydown", (e) => {
      if (!hover) return;
      if (e.key === "ArrowLeft") goTo(curTi - 1, true);
      else if (e.key === "ArrowRight") goTo(curTi + 1, true);
    });

    let down = false;
    let sx = 0;
    let sl = 0;
    vp.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.target.closest(".car-btn")) return;
      down = true;
      sx = e.clientX;
      sl = vp.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      vp.scrollLeft = sl - (e.clientX - sx);
    });
    window.addEventListener("pointerup", () => { down = false; });

    document.addEventListener("langchange", () => updateUI(curTi));
    window.addEventListener("resize", () => { vp.scrollTo({ left: curTi * W(), behavior: "auto" }); }, { passive: true });

    requestAnimationFrame(() => { vp.scrollLeft = W(); updateUI(1); });
  });

  safe(() => {
    if (reduceMotion) return;
    document.querySelectorAll(".car-viewport").forEach((vp) => {
      vp.addEventListener("mousemove", (e) => {
        const z = e.target.closest(".zoomable");
        if (!z) return;
        const img = z.querySelector("img");
        if (!img) return;
        const r = z.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        img.style.transformOrigin = x.toFixed(2) + "% " + y.toFixed(2) + "%";
      });
      vp.addEventListener("mouseleave", () => {
        vp.querySelectorAll(".zoomable img").forEach((img) => { img.style.transformOrigin = ""; });
      });
    });
  });

  safe(() => {
    const mIn = document.getElementById("mIn");
    const mOut = document.getElementById("mOut");
    const mFps = document.getElementById("mFps");
    if (!mIn || !mOut || !mFps) return;
    let countIn = 128;
    let countOut = 97;
    const flash = (el) => {
      el.classList.add("tick");
      setTimeout(() => el.classList.remove("tick"), 350);
    };
    setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Math.random() > 0.45) { countIn += 1; mIn.textContent = countIn; flash(mIn); }
      if (Math.random() > 0.6) { countOut += 1; mOut.textContent = countOut; flash(mOut); }
      mFps.textContent = 38 + Math.floor(Math.random() * 14);
    }, 1800);
  });

  safe(() => {
    const termBody = document.getElementById("termBody");
    if (!termBody) return;
    const lines = [];
    for (let i = 1; i <= 9; i++) {
      const l = termBody.dataset["l" + i];
      if (l) lines.push(l);
    }
    const lineClass = (text) => {
      if (text.startsWith(">")) return "cmd";
      if (text.startsWith("[OK]")) return "ok";
      if (text.startsWith("[INFO]")) return "info";
      return "";
    };
    const typeLines = (idx) => {
      if (idx >= lines.length) return;
      const text = lines[idx];
      const p = document.createElement("p");
      p.className = lineClass(text);
      termBody.appendChild(p);
      const cur = document.createElement("span");
      cur.className = "t-cursor";
      let ci = 0;
      const t = setInterval(() => {
        ci += 1;
        p.textContent = text.slice(0, ci);
        if (ci >= text.length) {
          clearInterval(t);
          if (idx === lines.length - 1) p.appendChild(cur);
          setTimeout(() => typeLines(idx + 1), 260);
        } else {
          p.appendChild(cur);
        }
      }, 22);
    };
    ready(() => {
      const termIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          termIO.unobserve(entry.target);
          if (reduceMotion) {
            lines.forEach((l) => {
              const p = document.createElement("p");
              p.className = lineClass(l);
              p.textContent = l;
              termBody.appendChild(p);
            });
            return;
          }
          typeLines(0);
        });
      }, { threshold: 0.3 });
      termIO.observe(termBody);
    });
  });

  safe(() => {
    const topicSelect = document.getElementById("topicSelect");
    if (!topicSelect) return;
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    const plan = params.get("plan");
    if (topic && Array.from(topicSelect.options).some((o) => o.value === topic)) {
      topicSelect.value = topic;
    }
    if (plan) {
      const msgEl = document.querySelector("textarea[name='message']");
      if (msgEl && !msgEl.value) {
        msgEl.removeAttribute("data-i18n-ph");
        const setPlanPh = () => {
          const dict = I18N[getLang()];
          const tpl = dict && dict.ct_ph_plan ? dict.ct_ph_plan : "{plan}";
          msgEl.placeholder = tpl.replace("{plan}", plan);
        };
        setPlanPh();
        document.addEventListener("langchange", setPlanPh);
      }
    }
  });

  safe(() => {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const okNote = document.getElementById("formOk");
    const errNote = document.getElementById("formErr");
    const sendBtn = document.getElementById("sendBtn");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      okNote.hidden = true;
      errNote.hidden = true;
      if (!form.reportValidity()) return;
      const dict = I18N[getLang()];
      sendBtn.disabled = true;
      sendBtn.textContent = dict.ct_sending;
      const fd = new FormData(form);
      const topicValue = fd.get("topic");
      const topicOption = form.querySelector('option[value="' + topicValue + '"]');
      try {
        const res = await fetch("https://formsubmit.co/ajax/peoplecounterpro@proton.me", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            name: fd.get("name"),
            email: fd.get("email"),
            topic: topicOption ? topicOption.textContent : topicValue,
            message: fd.get("message"),
            _subject: "People Counter PRO — " + (topicOption ? topicOption.textContent : topicValue),
            _template: "table",
            _captcha: "false"
          })
        });
        const data = await res.json();
        if (data.success === "true" || data.success === true) {
          okNote.hidden = false;
          form.reset();
        } else {
          errNote.hidden = false;
        }
      } catch (err) {
        errNote.hidden = false;
      }
      sendBtn.disabled = false;
      sendBtn.textContent = dict.ct_send;
    });
  });
});

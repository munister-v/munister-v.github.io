(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,59969,e=>{e.v({edges:"Atmosphere-module__-lpGdW__edges",grain:"Atmosphere-module__-lpGdW__grain",mark:"Atmosphere-module__-lpGdW__mark",root:"Atmosphere-module__-lpGdW__root",seam:"Atmosphere-module__-lpGdW__seam",veins:"Atmosphere-module__-lpGdW__veins",vignette:"Atmosphere-module__-lpGdW__vignette"})},77266,e=>{e.v({bar:"GenreRows-module__U8bExW__bar",index:"GenreRows-module__U8bExW__index",list:"GenreRows-module__U8bExW__list",panel:"GenreRows-module__U8bExW__panel",panelOn:"GenreRows-module__U8bExW__panelOn",panelSeal:"GenreRows-module__U8bExW__panelSeal",panelTint:"GenreRows-module__U8bExW__panelTint",panelTitle:"GenreRows-module__U8bExW__panelTitle",row:"GenreRows-module__U8bExW__row",rowOn:"GenreRows-module__U8bExW__rowOn",title:"GenreRows-module__U8bExW__title"})},91765,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(96299),a=e.i(59969);let i=[{x:46,rot:9,w:16},{x:26,rot:-8,w:22},{x:66,rot:14,w:13},{x:16,rot:6,w:25},{x:76,rot:-13,w:12},{x:54,rot:-5,w:19}];function s({className:e="",tint:r,variant:o,watermark:l=!0}){let u=null!=o?i[o%i.length]:null,d={...r?{"--tint":r}:{},...u?{"--seam-x":`${u.x}%`,"--seam-rot":`${u.rot}deg`,"--seam-w":`${u.w}%`,"--edge-rot":`${.6*u.rot}deg`,"--mark-rot":`${5*u.rot}deg`}:{}};return(0,t.jsxs)("div",{className:`${a.default.root} ${e}`,style:d,"aria-hidden":"true",children:[(0,t.jsx)("span",{className:a.default.seam}),(0,t.jsx)("span",{className:a.default.edges}),u&&l&&(0,t.jsx)("span",{className:a.default.mark,children:(0,t.jsx)(n.default,{})}),(0,t.jsx)("span",{className:a.default.veins}),(0,t.jsx)("span",{className:a.default.vignette}),(0,t.jsx)("span",{className:a.default.grain})]})}var o=e.i(77266);e.s(["default",0,function({genres:e}){let[a,i]=(0,r.useState)(null),[l,u]=(0,r.useState)(!1),d=(0,r.useRef)(null),c=(0,r.useRef)({x:0,y:0}),m=(0,r.useRef)({x:0,y:0});(0,r.useEffect)(()=>{let e=window.matchMedia("(hover: hover) and (pointer: fine)").matches,t=window.matchMedia("(prefers-reduced-motion: reduce)").matches;u(e&&!t)},[]),(0,r.useEffect)(()=>{if(!l)return;let e=0,t=()=>{m.current.x+=(c.current.x-m.current.x)*.14,m.current.y+=(c.current.y-m.current.y)*.14,d.current&&(d.current.style.transform=`translate3d(${m.current.x}px, ${m.current.y}px, 0) translate(32px, -55%)`),e=requestAnimationFrame(t)},r=e=>{c.current={x:e.clientX,y:e.clientY}};return window.addEventListener("pointermove",r,{passive:!0}),e=requestAnimationFrame(t),()=>{cancelAnimationFrame(e),window.removeEventListener("pointermove",r)}},[l]);let f=null===a?null:e[a];return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{className:o.default.list,onPointerLeave:()=>i(null),children:e.map((e,r)=>(0,t.jsxs)("div",{className:`${o.default.row} ${a===r?o.default.rowOn:""}`,style:{"--tint":e.tint},onPointerEnter:()=>i(r),children:[(0,t.jsx)("span",{className:o.default.index,children:String(r+1).padStart(2,"0")}),(0,t.jsx)("span",{className:o.default.title,children:e.title}),e.note&&(0,t.jsx)("span",{className:"micro",children:e.note}),(0,t.jsx)("span",{className:o.default.bar,"aria-hidden":"true"})]},e.slug))}),l&&(0,t.jsxs)("div",{ref:d,className:`${o.default.panel} ${f?o.default.panelOn:""}`,style:{"--tint":f?.tint??"#161616"},"aria-hidden":"true",children:[(0,t.jsx)(s,{}),(0,t.jsx)("span",{className:o.default.panelTint}),(0,t.jsx)("span",{className:o.default.panelSeal,children:(0,t.jsx)(n.default,{ticks:48,star:!1})}),(0,t.jsx)("span",{className:o.default.panelTitle,children:f?.title})]})]})}],91765)},33408,e=>{e.v({on:"LitText-module__Pp7nGq__on",root:"LitText-module__Pp7nGq__root",word:"LitText-module__Pp7nGq__word"})},11467,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(33408);e.s(["default",0,function({text:e,className:a=""}){let i=(0,r.useRef)(null),s=e.split(" ");return(0,r.useEffect)(()=>{let e=i.current;if(!e)return;let t=Array.from(e.querySelectorAll("[data-w]"));if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return void t.forEach(e=>e.classList.add(n.default.on));let r=0,a=()=>{r=0;let a=e.getBoundingClientRect(),i=window.innerHeight,s=Math.round(Math.min(1,Math.max(0,(.85*i-a.top)/(a.height+.45*i)))*t.length);t.forEach((e,t)=>e.classList.toggle(n.default.on,t<s))},s=()=>{r||(r=requestAnimationFrame(a))};return a(),window.addEventListener("scroll",s,{passive:!0}),window.addEventListener("resize",s),()=>{cancelAnimationFrame(r),window.removeEventListener("scroll",s),window.removeEventListener("resize",s)}},[]),(0,t.jsx)("p",{ref:i,className:`${n.default.root} ${a}`,children:s.map((e,r)=>(0,t.jsxs)("span",{"data-w":!0,className:n.default.word,children:[e,r<s.length-1?" ":""]},r))})}])},59095,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,delay:n=0,as:a="div",className:i="",style:s}){let o=(0,r.useRef)(null),[l,u]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{let e=o.current;if(!e)return;if(!("IntersectionObserver"in window))return void u(!0);let t=new IntersectionObserver(([e])=>{e.isIntersecting&&(u(!0),t.disconnect())},{rootMargin:"0px 0px -12% 0px",threshold:.08});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(a,{ref:o,className:`reveal ${l?"in":""} ${i}`,style:{...s,"--d":`${n}ms`},children:e})}])},52004,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,className:n="",as:a="section",...i}){let s=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=s.current;if(!e)return;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){e.style.setProperty("--p","0.5"),e.style.setProperty("--in","1");return}let t=0,r=()=>{t=0;let r=e.getBoundingClientRect(),n=window.innerHeight,a=Math.min(1,Math.max(0,(n-r.top)/(n+r.height))),i=Math.min(1,Math.max(0,(n-r.top)/(.75*n)));e.style.setProperty("--p",a.toFixed(4)),e.style.setProperty("--in",i.toFixed(4))},n=()=>{t||(t=requestAnimationFrame(r))};return r(),window.addEventListener("scroll",n,{passive:!0}),window.addEventListener("resize",n),()=>{cancelAnimationFrame(t),window.removeEventListener("scroll",n),window.removeEventListener("resize",n)}},[]),(0,t.jsx)(a,{ref:s,className:n,...i,children:e})}])},37002,e=>{e.v({smoke:"Smoke-module__Qt-M6q__smoke"})},85669,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(37002);let a=`
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`,i=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_tint;
uniform float u_int;
uniform vec2 u_src;

// sin-free hash (Hoskins): stays in small numbers, safe at low precision
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 2.4;
  float t = u_t * 0.03;
  vec2 q = vec2(fbm(p + vec2(0.0, -t)), fbm(p + vec2(5.2, 1.3 + t)));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) - t * 1.4),
                fbm(p + 3.0 * q + vec2(8.3, 2.8) + t));
  float f = fbm(p + 2.6 * r);
  // only the densest folds show, squared into thin wisps; thinning upward
  float smoke = smoothstep(0.52, 1.0, f);
  smoke *= smoke;
  smoke *= smoothstep(1.05, 0.15, uv.y);
  vec2 d = (uv - u_src) * vec2(1.3, 1.0);
  float glow = exp(-dot(d, d) * 5.5);
  // cool grey smoke; the warm tint lives only in the light under it
  vec3 col = vec3(0.86, 0.88, 0.9) * smoke * 0.34
           + u_tint * glow * (0.07 + smoke * 0.55);
  gl_FragColor = vec4(col * u_int, 1.0);
}
`;function s(e,t,r){let n=e.createShader(t);return n?(e.shaderSource(n,r),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:null):null}e.s(["default",0,function({tint:e=[.76,.6,.3],intensity:o=1,source:l=[.5,.12],className:u=""}){let d=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let t=d.current;if(!t)return;let r=t.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!r||r.isContextLost())return;let n=e=>{e.preventDefault(),t.style.opacity="0"};t.addEventListener("webglcontextlost",n);let u=s(r,r.VERTEX_SHADER,a),c=s(r,r.FRAGMENT_SHADER,i);if(!u||!c)return;let m=r.createProgram();if(!m||(r.attachShader(m,u),r.attachShader(m,c),r.linkProgram(m),!r.getProgramParameter(m,r.LINK_STATUS)))return;r.useProgram(m);let f=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,f),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let p=r.getAttribLocation(m,"a");r.enableVertexAttribArray(p),r.vertexAttribPointer(p,2,r.FLOAT,!1,0,0);let _=r.getUniformLocation(m,"u_res"),h=r.getUniformLocation(m,"u_t");r.uniform3f(r.getUniformLocation(m,"u_tint"),e[0],e[1],e[2]),r.uniform1f(r.getUniformLocation(m,"u_int"),o),r.uniform2f(r.getUniformLocation(m,"u_src"),l[0],l[1]);let v=window.matchMedia("(prefers-reduced-motion: reduce)").matches,x=.5*Math.min(window.devicePixelRatio||1,2),w=0,g=0,E=0,A=!1,b=performance.now()-4e4*Math.random(),y=()=>{let e,n;e=Math.max(1,Math.round(t.clientWidth*x)),n=Math.max(1,Math.round(t.clientHeight*x)),(w!==e||g!==n)&&(w=e,g=n,t.width=e,t.height=n,r.viewport(0,0,e,n),r.uniform2f(_,e,n)),r.uniform1f(h,(performance.now()-b)/1e3),r.drawArrays(r.TRIANGLES,0,3)},R=()=>{y(),A&&!v&&(E=requestAnimationFrame(R))},L=new IntersectionObserver(([e])=>{A=e.isIntersecting,cancelAnimationFrame(E),A&&R()});return L.observe(t),y(),()=>{L.disconnect(),cancelAnimationFrame(E),t.removeEventListener("webglcontextlost",n)}},[]),(0,t.jsx)("canvas",{ref:d,className:`${n.default.smoke} ${u}`,"aria-hidden":"true"})}])}]);
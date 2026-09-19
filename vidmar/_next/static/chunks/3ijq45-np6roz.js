(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33408,e=>{e.v({on:"LitText-module__Pp7nGq__on",root:"LitText-module__Pp7nGq__root",word:"LitText-module__Pp7nGq__word"})},11467,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(33408);e.s(["default",0,function({text:e,className:i=""}){let o=(0,r.useRef)(null),a=e.split(" ");return(0,r.useEffect)(()=>{let e=o.current;if(!e)return;let t=Array.from(e.querySelectorAll("[data-w]"));if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return void t.forEach(e=>e.classList.add(n.default.on));let r=0,i=()=>{r=0;let i=e.getBoundingClientRect(),o=window.innerHeight,a=Math.round(Math.min(1,Math.max(0,(.85*o-i.top)/(i.height+.45*o)))*t.length);t.forEach((e,t)=>e.classList.toggle(n.default.on,t<a))},a=()=>{r||(r=requestAnimationFrame(i))};return i(),window.addEventListener("scroll",a,{passive:!0}),window.addEventListener("resize",a),()=>{cancelAnimationFrame(r),window.removeEventListener("scroll",a),window.removeEventListener("resize",a)}},[]),(0,t.jsx)("p",{ref:o,className:`${n.default.root} ${i}`,children:a.map((e,r)=>(0,t.jsxs)("span",{"data-w":!0,className:n.default.word,children:[e,r<a.length-1?" ":""]},r))})}])},59095,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,delay:n=0,as:i="div",className:o="",style:a}){let s=(0,r.useRef)(null),[l,c]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{let e=s.current;if(!e)return;if(!("IntersectionObserver"in window))return void c(!0);let t=new IntersectionObserver(([e])=>{e.isIntersecting&&(c(!0),t.disconnect())},{rootMargin:"0px 0px -12% 0px",threshold:.08});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(i,{ref:s,className:`reveal ${l?"in":""} ${o}`,style:{...a,"--d":`${n}ms`},children:e})}])},52004,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,className:n="",as:i="section",...o}){let a=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=a.current;if(!e)return;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){e.style.setProperty("--p","0.5"),e.style.setProperty("--in","1");return}let t=0,r=()=>{t=0;let r=e.getBoundingClientRect(),n=window.innerHeight,i=Math.min(1,Math.max(0,(n-r.top)/(n+r.height))),o=Math.min(1,Math.max(0,(n-r.top)/(.75*n)));e.style.setProperty("--p",i.toFixed(4)),e.style.setProperty("--in",o.toFixed(4))},n=()=>{t||(t=requestAnimationFrame(r))};return r(),window.addEventListener("scroll",n,{passive:!0}),window.addEventListener("resize",n),()=>{cancelAnimationFrame(t),window.removeEventListener("scroll",n),window.removeEventListener("resize",n)}},[]),(0,t.jsx)(i,{ref:a,className:n,...o,children:e})}])},37002,e=>{e.v({smoke:"Smoke-module__Qt-M6q__smoke"})},85669,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(37002);let i=`
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`,o=`
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
`;function a(e,t,r){let n=e.createShader(t);return n?(e.shaderSource(n,r),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:null):null}e.s(["default",0,function({tint:e=[.76,.6,.3],intensity:s=1,source:l=[.5,.12],className:c=""}){let u=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let t=u.current;if(!t)return;let r=t.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!r||r.isContextLost())return;let n=e=>{e.preventDefault(),t.style.opacity="0"};t.addEventListener("webglcontextlost",n);let c=a(r,r.VERTEX_SHADER,i),f=a(r,r.FRAGMENT_SHADER,o);if(!c||!f)return;let d=r.createProgram();if(!d||(r.attachShader(d,c),r.attachShader(d,f),r.linkProgram(d),!r.getProgramParameter(d,r.LINK_STATUS)))return;r.useProgram(d);let m=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,m),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let v=r.getAttribLocation(d,"a");r.enableVertexAttribArray(v),r.vertexAttribPointer(v,2,r.FLOAT,!1,0,0);let h=r.getUniformLocation(d,"u_res"),p=r.getUniformLocation(d,"u_t");r.uniform3f(r.getUniformLocation(d,"u_tint"),e[0],e[1],e[2]),r.uniform1f(r.getUniformLocation(d,"u_int"),s),r.uniform2f(r.getUniformLocation(d,"u_src"),l[0],l[1]);let w=window.matchMedia("(prefers-reduced-motion: reduce)").matches,g=.5*Math.min(window.devicePixelRatio||1,2),_=0,x=0,A=0,y=!1,E=performance.now()-4e4*Math.random(),L=()=>{let e,n;e=Math.max(1,Math.round(t.clientWidth*g)),n=Math.max(1,Math.round(t.clientHeight*g)),(_!==e||x!==n)&&(_=e,x=n,t.width=e,t.height=n,r.viewport(0,0,e,n),r.uniform2f(h,e,n)),r.uniform1f(p,(performance.now()-E)/1e3),r.drawArrays(r.TRIANGLES,0,3)},b=()=>{L(),y&&!w&&(A=requestAnimationFrame(b))},R=new IntersectionObserver(([e])=>{y=e.isIntersecting,cancelAnimationFrame(A),y&&b()});return R.observe(t),L(),()=>{R.disconnect(),cancelAnimationFrame(A),t.removeEventListener("webglcontextlost",n)}},[]),(0,t.jsx)("canvas",{ref:u,className:`${n.default.smoke} ${c}`,"aria-hidden":"true"})}])}]);
(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,59095,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,delay:i=0,as:n="div",className:o="",style:a}){let s=(0,r.useRef)(null),[l,c]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{let e=s.current;if(!e)return;if(!("IntersectionObserver"in window))return void c(!0);let t=new IntersectionObserver(([e])=>{e.isIntersecting&&(c(!0),t.disconnect())},{rootMargin:"0px 0px -12% 0px",threshold:.08});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(n,{ref:s,className:`reveal ${l?"in":""} ${o}`,style:{...a,"--d":`${i}ms`},children:e})}])},52004,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,className:i="",as:n="section",...o}){let a=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=a.current;if(!e)return;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){e.style.setProperty("--p","0.5"),e.style.setProperty("--in","1");return}let t=0,r=()=>{t=0;let r=e.getBoundingClientRect(),i=window.innerHeight,n=Math.min(1,Math.max(0,(i-r.top)/(i+r.height))),o=Math.min(1,Math.max(0,(i-r.top)/(.75*i)));e.style.setProperty("--p",n.toFixed(4)),e.style.setProperty("--in",o.toFixed(4))},i=()=>{t||(t=requestAnimationFrame(r))};return r(),window.addEventListener("scroll",i,{passive:!0}),window.addEventListener("resize",i),()=>{cancelAnimationFrame(t),window.removeEventListener("scroll",i),window.removeEventListener("resize",i)}},[]),(0,t.jsx)(n,{ref:a,className:i,...o,children:e})}])},37002,e=>{e.v({smoke:"Smoke-module__Qt-M6q__smoke"})},85669,e=>{"use strict";var t=e.i(43476),r=e.i(71645),i=e.i(37002);let n=`
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
`;function a(e,t,r){let i=e.createShader(t);return i?(e.shaderSource(i,r),e.compileShader(i),e.getShaderParameter(i,e.COMPILE_STATUS)?i:null):null}e.s(["default",0,function({tint:e=[.76,.6,.3],intensity:s=1,source:l=[.5,.12],className:c=""}){let u=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let t=u.current;if(!t)return;let r=t.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!r||r.isContextLost())return;let i=e=>{e.preventDefault(),t.style.opacity="0"};t.addEventListener("webglcontextlost",i);let c=a(r,r.VERTEX_SHADER,n),f=a(r,r.FRAGMENT_SHADER,o);if(!c||!f)return;let m=r.createProgram();if(!m||(r.attachShader(m,c),r.attachShader(m,f),r.linkProgram(m),!r.getProgramParameter(m,r.LINK_STATUS)))return;r.useProgram(m);let d=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,d),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let v=r.getAttribLocation(m,"a");r.enableVertexAttribArray(v),r.vertexAttribPointer(v,2,r.FLOAT,!1,0,0);let h=r.getUniformLocation(m,"u_res"),p=r.getUniformLocation(m,"u_t");r.uniform3f(r.getUniformLocation(m,"u_tint"),e[0],e[1],e[2]),r.uniform1f(r.getUniformLocation(m,"u_int"),s),r.uniform2f(r.getUniformLocation(m,"u_src"),l[0],l[1]);let g=window.matchMedia("(prefers-reduced-motion: reduce)").matches,_=.5*Math.min(window.devicePixelRatio||1,2),w=0,x=0,b=0,y=!1,A=performance.now()-4e4*Math.random(),R=()=>{let e,i;e=Math.max(1,Math.round(t.clientWidth*_)),i=Math.max(1,Math.round(t.clientHeight*_)),(w!==e||x!==i)&&(w=e,x=i,t.width=e,t.height=i,r.viewport(0,0,e,i),r.uniform2f(h,e,i)),r.uniform1f(p,(performance.now()-A)/1e3),r.drawArrays(r.TRIANGLES,0,3)},S=()=>{R(),y&&!g&&(b=requestAnimationFrame(S))},E=new IntersectionObserver(([e])=>{y=e.isIntersecting,cancelAnimationFrame(b),y&&S()});return E.observe(t),R(),()=>{E.disconnect(),cancelAnimationFrame(b),t.removeEventListener("webglcontextlost",i)}},[]),(0,t.jsx)("canvas",{ref:u,className:`${i.default.smoke} ${c}`,"aria-hidden":"true"})}])},57148,e=>{e.v({form:"Subscribe-module__0fdgWW__form"})},90470,e=>{"use strict";var t=e.i(43476),r=e.i(71645),i=e.i(26015),n=e.i(57148);e.s(["default",0,function(){let e=(0,i.useToast)(),[o,a]=(0,r.useState)("");return(0,t.jsxs)("form",{className:n.default.form,onSubmit:t=>{t.preventDefault(),o&&(a(""),e("готово — лист про підтвердження вже летить"))},children:[(0,t.jsx)("input",{id:"subscribe-email",type:"email",required:!0,value:o,placeholder:"ваша пошта","aria-label":"Ваша пошта",onChange:e=>a(e.target.value)}),(0,t.jsx)("button",{type:"submit",className:"pill",children:"Підписатись"})]})}])}]);
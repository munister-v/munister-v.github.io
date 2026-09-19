(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,87942,e=>{e.v({card:"CatalogGrid-module__zwXbsq__card",cardGenre:"CatalogGrid-module__zwXbsq__cardGenre",cardState:"CatalogGrid-module__zwXbsq__cardState",chip:"CatalogGrid-module__zwXbsq__chip",chipOn:"CatalogGrid-module__zwXbsq__chipOn",filters:"CatalogGrid-module__zwXbsq__filters",grid:"CatalogGrid-module__zwXbsq__grid",none:"CatalogGrid-module__zwXbsq__none",shimmer:"CatalogGrid-module__zwXbsq__shimmer",spine:"CatalogGrid-module__zwXbsq__spine",sweep:"CatalogGrid-module__zwXbsq__sweep"})},47756,e=>{"use strict";var t=e.i(43476),r=e.i(71645),i=e.i(59095),a=e.i(87942);e.s(["default",0,function({genres:e}){let[n,s]=(0,r.useState)(null),o=n?e.filter(e=>e.slug===n):e;return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("div",{className:a.default.filters,role:"group","aria-label":"Фільтр за напрямом",children:[(0,t.jsx)("button",{type:"button",className:`${a.default.chip} ${null===n?a.default.chipOn:""}`,onClick:()=>s(null),children:"Усі напрями"}),e.map(e=>(0,t.jsx)("button",{type:"button",className:`${a.default.chip} ${n===e.slug?a.default.chipOn:""}`,style:{"--tint":e.tint},onClick:()=>s(e.slug),"aria-pressed":n===e.slug,children:e.title},e.slug))]}),0===o.length?(0,t.jsx)("p",{className:`body ${a.default.none}`,children:"У цьому напрямі поки нічого не заплановано."}):(0,t.jsx)("div",{className:a.default.grid,children:o.map((e,r)=>(0,t.jsxs)(i.default,{delay:60*r,className:a.default.card,style:{"--tint":e.tint},children:[(0,t.jsx)("span",{className:a.default.spine,"aria-hidden":"true"}),(0,t.jsx)("span",{className:a.default.shimmer,"aria-hidden":"true"}),(0,t.jsx)("span",{className:a.default.cardGenre,children:e.title}),(0,t.jsx)("span",{className:`micro ${a.default.cardState}`,children:"Готується"})]},e.slug))})]})}])},59095,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,delay:i=0,as:a="div",className:n="",style:s}){let o=(0,r.useRef)(null),[l,c]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{let e=o.current;if(!e)return;if(!("IntersectionObserver"in window))return void c(!0);let t=new IntersectionObserver(([e])=>{e.isIntersecting&&(c(!0),t.disconnect())},{rootMargin:"0px 0px -12% 0px",threshold:.08});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(a,{ref:o,className:`reveal ${l?"in":""} ${n}`,style:{...s,"--d":`${i}ms`},children:e})}])},52004,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,className:i="",as:a="section",...n}){let s=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=s.current;if(!e)return;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){e.style.setProperty("--p","0.5"),e.style.setProperty("--in","1");return}let t=0,r=()=>{t=0;let r=e.getBoundingClientRect(),i=window.innerHeight,a=Math.min(1,Math.max(0,(i-r.top)/(i+r.height))),n=Math.min(1,Math.max(0,(i-r.top)/(.75*i)));e.style.setProperty("--p",a.toFixed(4)),e.style.setProperty("--in",n.toFixed(4))},i=()=>{t||(t=requestAnimationFrame(r))};return r(),window.addEventListener("scroll",i,{passive:!0}),window.addEventListener("resize",i),()=>{cancelAnimationFrame(t),window.removeEventListener("scroll",i),window.removeEventListener("resize",i)}},[]),(0,t.jsx)(a,{ref:s,className:i,...n,children:e})}])},37002,e=>{e.v({smoke:"Smoke-module__Qt-M6q__smoke"})},85669,e=>{"use strict";var t=e.i(43476),r=e.i(71645),i=e.i(37002);let a=`
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`,n=`
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
`;function s(e,t,r){let i=e.createShader(t);return i?(e.shaderSource(i,r),e.compileShader(i),e.getShaderParameter(i,e.COMPILE_STATUS)?i:null):null}e.s(["default",0,function({tint:e=[.76,.6,.3],intensity:o=1,source:l=[.5,.12],className:c=""}){let u=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let t=u.current;if(!t)return;let r=t.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!r||r.isContextLost())return;let i=e=>{e.preventDefault(),t.style.opacity="0"};t.addEventListener("webglcontextlost",i);let c=s(r,r.VERTEX_SHADER,a),d=s(r,r.FRAGMENT_SHADER,n);if(!c||!d)return;let m=r.createProgram();if(!m||(r.attachShader(m,c),r.attachShader(m,d),r.linkProgram(m),!r.getProgramParameter(m,r.LINK_STATUS)))return;r.useProgram(m);let f=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,f),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let h=r.getAttribLocation(m,"a");r.enableVertexAttribArray(h),r.vertexAttribPointer(h,2,r.FLOAT,!1,0,0);let p=r.getUniformLocation(m,"u_res"),_=r.getUniformLocation(m,"u_t");r.uniform3f(r.getUniformLocation(m,"u_tint"),e[0],e[1],e[2]),r.uniform1f(r.getUniformLocation(m,"u_int"),o),r.uniform2f(r.getUniformLocation(m,"u_src"),l[0],l[1]);let v=window.matchMedia("(prefers-reduced-motion: reduce)").matches,g=.5*Math.min(window.devicePixelRatio||1,2),b=0,w=0,x=0,y=!1,A=performance.now()-4e4*Math.random(),S=()=>{let e,i;e=Math.max(1,Math.round(t.clientWidth*g)),i=Math.max(1,Math.round(t.clientHeight*g)),(b!==e||w!==i)&&(b=e,w=i,t.width=e,t.height=i,r.viewport(0,0,e,i),r.uniform2f(p,e,i)),r.uniform1f(_,(performance.now()-A)/1e3),r.drawArrays(r.TRIANGLES,0,3)},C=()=>{S(),y&&!v&&(x=requestAnimationFrame(C))},R=new IntersectionObserver(([e])=>{y=e.isIntersecting,cancelAnimationFrame(x),y&&C()});return R.observe(t),S(),()=>{R.disconnect(),cancelAnimationFrame(x),t.removeEventListener("webglcontextlost",i)}},[]),(0,t.jsx)("canvas",{ref:u,className:`${i.default.smoke} ${c}`,"aria-hidden":"true"})}])},57148,e=>{e.v({form:"Subscribe-module__0fdgWW__form"})},90470,e=>{"use strict";var t=e.i(43476),r=e.i(71645),i=e.i(26015),a=e.i(57148);e.s(["default",0,function(){let e=(0,i.useToast)(),[n,s]=(0,r.useState)("");return(0,t.jsxs)("form",{className:a.default.form,onSubmit:t=>{t.preventDefault(),n&&(s(""),e("готово — лист про підтвердження вже летить"))},children:[(0,t.jsx)("input",{id:"subscribe-email",type:"email",required:!0,value:n,placeholder:"ваша пошта","aria-label":"Ваша пошта",onChange:e=>s(e.target.value)}),(0,t.jsx)("button",{type:"submit",className:"pill",children:"Підписатись"})]})}])}]);
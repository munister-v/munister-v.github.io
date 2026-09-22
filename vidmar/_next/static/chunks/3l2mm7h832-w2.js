(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,87942,e=>{e.v({card:"CatalogGrid-module__zwXbsq__card",cardGenre:"CatalogGrid-module__zwXbsq__cardGenre",cardReal:"CatalogGrid-module__zwXbsq__cardReal",cardState:"CatalogGrid-module__zwXbsq__cardState",chip:"CatalogGrid-module__zwXbsq__chip",chipOn:"CatalogGrid-module__zwXbsq__chipOn",cover:"CatalogGrid-module__zwXbsq__cover",filters:"CatalogGrid-module__zwXbsq__filters",grid:"CatalogGrid-module__zwXbsq__grid",none:"CatalogGrid-module__zwXbsq__none",shimmer:"CatalogGrid-module__zwXbsq__shimmer",spine:"CatalogGrid-module__zwXbsq__spine",sweep:"CatalogGrid-module__zwXbsq__sweep"})},47756,e=>{"use strict";var t=e.i(43476),r=e.i(71645),a=e.i(54858),i=e.i(59095),n=e.i(87942);e.s(["default",0,function({genres:e}){let[s,o]=(0,r.useState)(null),[l,c]=(0,r.useState)([]);(0,r.useEffect)(()=>{(0,a.getBooks)().then(c)},[]);let u=s?e.filter(e=>e.slug===s):e;return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("div",{className:n.default.filters,role:"group","aria-label":"Фільтр за напрямом",children:[(0,t.jsx)("button",{type:"button",className:`${n.default.chip} ${null===s?n.default.chipOn:""}`,onClick:()=>o(null),children:"Усі напрями"}),e.map(e=>(0,t.jsx)("button",{type:"button",className:`${n.default.chip} ${s===e.slug?n.default.chipOn:""}`,style:{"--tint":e.tint},onClick:()=>o(e.slug),"aria-pressed":s===e.slug,children:e.title},e.slug))]}),0===u.length?(0,t.jsx)("p",{className:`body ${n.default.none}`,children:"У цьому напрямі поки нічого не заплановано."}):(0,t.jsx)("div",{className:n.default.grid,children:u.map((e,r)=>{let a=l.filter(t=>t.genre_slug===e.slug);return 0===a.length?(0,t.jsxs)(i.default,{delay:60*r,className:n.default.card,style:{"--tint":e.tint},children:[(0,t.jsx)("span",{className:n.default.spine,"aria-hidden":"true"}),(0,t.jsx)("span",{className:n.default.shimmer,"aria-hidden":"true"}),(0,t.jsx)("span",{className:n.default.cardGenre,children:e.title}),(0,t.jsx)("span",{className:`micro ${n.default.cardState}`,children:"Готується"})]},e.slug):a.map((a,s)=>(0,t.jsxs)(i.default,{delay:(r+s)*60,className:`${n.default.card} ${n.default.cardReal}`,style:{"--tint":e.tint},children:[a.cover_url&&(0,t.jsx)("img",{className:n.default.cover,src:a.cover_url,alt:"",loading:"lazy",decoding:"async"}),(0,t.jsx)("span",{className:n.default.spine,"aria-hidden":"true"}),(0,t.jsx)("span",{className:n.default.cardGenre,children:a.title}),a.author&&(0,t.jsx)("span",{className:`micro ${n.default.cardState}`,children:a.author})]},a.slug))})})]})}])},59095,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,delay:a=0,as:i="div",className:n="",style:s,id:o}){let l=(0,r.useRef)(null),[c,u]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{let e=l.current;if(!e)return;if(!("IntersectionObserver"in window))return void u(!0);let t=new IntersectionObserver(([e])=>{e.isIntersecting&&(u(!0),t.disconnect())},{rootMargin:"0px 0px -12% 0px",threshold:.08});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(i,{ref:l,id:o,className:`reveal ${c?"in":""} ${n}`,style:{...s,"--d":`${a}ms`},children:e})}])},52004,e=>{"use strict";var t=e.i(43476),r=e.i(71645);e.s(["default",0,function({children:e,className:a="",as:i="section",...n}){let s=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=s.current;if(!e)return;if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){e.style.setProperty("--p","0.5"),e.style.setProperty("--in","1");return}let t=0,r=()=>{t=0;let r=e.getBoundingClientRect(),a=window.innerHeight,i=Math.min(1,Math.max(0,(a-r.top)/(a+r.height))),n=Math.min(1,Math.max(0,(a-r.top)/(.75*a)));e.style.setProperty("--p",i.toFixed(4)),e.style.setProperty("--in",n.toFixed(4))},a=()=>{t||(t=requestAnimationFrame(r))};return r(),window.addEventListener("scroll",a,{passive:!0}),window.addEventListener("resize",a),()=>{cancelAnimationFrame(t),window.removeEventListener("scroll",a),window.removeEventListener("resize",a)}},[]),(0,t.jsx)(i,{ref:s,className:a,...n,children:e})}])},37002,e=>{e.v({smoke:"Smoke-module__Qt-M6q__smoke"})},85669,e=>{"use strict";var t=e.i(43476),r=e.i(71645),a=e.i(37002);let i=`
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
`;function s(e,t,r){let a=e.createShader(t);return a?(e.shaderSource(a,r),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)?a:null):null}e.s(["default",0,function({tint:e=[.76,.6,.3],intensity:o=1,source:l=[.5,.12],className:c=""}){let u=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let t=u.current;if(!t)return;let r=t.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!r||r.isContextLost())return;let a=e=>{e.preventDefault(),t.style.opacity="0"};t.addEventListener("webglcontextlost",a);let c=s(r,r.VERTEX_SHADER,i),d=s(r,r.FRAGMENT_SHADER,n);if(!c||!d)return;let f=r.createProgram();if(!f||(r.attachShader(f,c),r.attachShader(f,d),r.linkProgram(f),!r.getProgramParameter(f,r.LINK_STATUS)))return;r.useProgram(f);let m=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,m),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let h=r.getAttribLocation(f,"a");r.enableVertexAttribArray(h),r.vertexAttribPointer(h,2,r.FLOAT,!1,0,0);let p=r.getUniformLocation(f,"u_res"),_=r.getUniformLocation(f,"u_t");r.uniform3f(r.getUniformLocation(f,"u_tint"),e[0],e[1],e[2]),r.uniform1f(r.getUniformLocation(f,"u_int"),o),r.uniform2f(r.getUniformLocation(f,"u_src"),l[0],l[1]);let v=window.matchMedia("(prefers-reduced-motion: reduce)").matches,g=.5*Math.min(window.devicePixelRatio||1,2),b=0,w=0,y=0,x=!1,S=performance.now()-4e4*Math.random(),A=()=>{let e,a;e=Math.max(1,Math.round(t.clientWidth*g)),a=Math.max(1,Math.round(t.clientHeight*g)),(b!==e||w!==a)&&(b=e,w=a,t.width=e,t.height=a,r.viewport(0,0,e,a),r.uniform2f(p,e,a)),r.uniform1f(_,(performance.now()-S)/1e3),r.drawArrays(r.TRIANGLES,0,3)},j=()=>{A(),x&&!v&&(y=requestAnimationFrame(j))},k=new IntersectionObserver(([e])=>{x=e.isIntersecting,cancelAnimationFrame(y),x&&j()});return k.observe(t),A(),()=>{k.disconnect(),cancelAnimationFrame(y),t.removeEventListener("webglcontextlost",a)}},[]),(0,t.jsx)("canvas",{ref:u,className:`${a.default.smoke} ${c}`,"aria-hidden":"true"})}])},57148,e=>{e.v({form:"Subscribe-module__0fdgWW__form"})},90470,e=>{"use strict";var t=e.i(43476),r=e.i(71645),a=e.i(54858),i=e.i(26015),n=e.i(57148);e.s(["default",0,function(){let e=(0,i.useToast)(),[s,o]=(0,r.useState)(""),[l,c]=(0,r.useState)(!1);return(0,t.jsxs)("form",{className:n.default.form,onSubmit:async t=>{if(t.preventDefault(),s&&!l){c(!0);try{await (0,a.subscribe)(s),o(""),e("готово – ви в списку")}catch{e("не вдалося підписати, спробуйте пізніше")}finally{c(!1)}}},children:[(0,t.jsx)("input",{id:"subscribe-email",type:"email",required:!0,value:s,placeholder:"ваша пошта","aria-label":"Ваша пошта",onChange:e=>o(e.target.value)}),(0,t.jsx)("button",{type:"submit",className:"pill",disabled:l,children:"Підписатись"})]})}])},54858,e=>{"use strict";let t=e.i(47167).default.env.NEXT_PUBLIC_API_BASE??"https://vidmar-api.munister.com.ua";class r extends Error{}async function a(e,a){let i=await fetch(`${t}${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!i.ok){let e=await i.json().catch(()=>null);throw new r(e?.error||"server error")}return i.json()}async function i(){let e=await fetch(`${t}/books`,{cache:"no-store"});return e.ok?e.json():[]}async function n(e,a,i){let n=await fetch(`${t}${e}`,{...i,headers:{...{"Content-Type":"application/json",Authorization:`Bearer ${a}`},...i?.headers||{}},cache:"no-store"});if(!n.ok){let e=await n.json().catch(()=>null);throw new r(e?.error||`request failed (${n.status})`)}return 204===n.status?null:n.json()}e.s(["ApiError",0,r,"createBook",0,function(e,t){return n("/admin/books",e,{method:"POST",body:JSON.stringify(t)})},"deleteBook",0,function(e,t){return n(`/admin/books/${t}`,e,{method:"DELETE"})},"getBooks",0,i,"listAdminBooks",0,function(e){return n("/admin/books",e)},"submitManuscript",0,function(e){return a("/submissions",e)},"subscribe",0,function(e){return a("/subscribe",{email:e})},"updateBook",0,function(e,t,r){return n(`/admin/books/${t}`,e,{method:"PUT",body:JSON.stringify(r)})}])}]);
(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,37002,e=>{e.v({smoke:"Smoke-module__Qt-M6q__smoke"})},85669,e=>{"use strict";var t=e.i(43476),r=e.i(71645),o=e.i(37002);let i=`
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
`;function a(e,t,r){let o=e.createShader(t);return o?(e.shaderSource(o,r),e.compileShader(o),e.getShaderParameter(o,e.COMPILE_STATUS)?o:null):null}e.s(["default",0,function({tint:e=[.76,.6,.3],intensity:c=1,source:s=[.5,.12],className:f=""}){let l=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let t=l.current;if(!t)return;let r=t.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!r||r.isContextLost())return;let o=e=>{e.preventDefault(),t.style.opacity="0"};t.addEventListener("webglcontextlost",o);let f=a(r,r.VERTEX_SHADER,i),m=a(r,r.FRAGMENT_SHADER,n);if(!f||!m)return;let u=r.createProgram();if(!u||(r.attachShader(u,f),r.attachShader(u,m),r.linkProgram(u),!r.getProgramParameter(u,r.LINK_STATUS)))return;r.useProgram(u);let v=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,v),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let h=r.getAttribLocation(u,"a");r.enableVertexAttribArray(h),r.vertexAttribPointer(h,2,r.FLOAT,!1,0,0);let d=r.getUniformLocation(u,"u_res"),p=r.getUniformLocation(u,"u_t");r.uniform3f(r.getUniformLocation(u,"u_tint"),e[0],e[1],e[2]),r.uniform1f(r.getUniformLocation(u,"u_int"),c),r.uniform2f(r.getUniformLocation(u,"u_src"),s[0],s[1]);let _=window.matchMedia("(prefers-reduced-motion: reduce)").matches,g=.5*Math.min(window.devicePixelRatio||1,2),A=0,b=0,x=0,w=!1,R=performance.now()-4e4*Math.random(),y=()=>{let e,o;e=Math.max(1,Math.round(t.clientWidth*g)),o=Math.max(1,Math.round(t.clientHeight*g)),(A!==e||b!==o)&&(A=e,b=o,t.width=e,t.height=o,r.viewport(0,0,e,o),r.uniform2f(d,e,o)),r.uniform1f(p,(performance.now()-R)/1e3),r.drawArrays(r.TRIANGLES,0,3)},S=()=>{y(),w&&!_&&(x=requestAnimationFrame(S))},T=new IntersectionObserver(([e])=>{w=e.isIntersecting,cancelAnimationFrame(x),w&&S()});return T.observe(t),y(),()=>{T.disconnect(),cancelAnimationFrame(x),t.removeEventListener("webglcontextlost",o)}},[]),(0,t.jsx)("canvas",{ref:l,className:`${o.default.smoke} ${f}`,"aria-hidden":"true"})}])}]);
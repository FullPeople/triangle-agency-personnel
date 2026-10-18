const test=require('node:test'),assert=require('node:assert/strict');
const {profile}=require('../src/compatibility.js');
test('WeChat and QQ choose stable rendering even when their user agents also say Chrome',()=>{
  for(const token of ['MicroMessenger/8.0','QQ/9.0','MQQBrowser/14.0']){
    const p=profile({userAgent:`Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0 ${token}`,width:1280});
    assert.equal(p.embedded,true);assert.equal(p.stable,true);
  }
});
test('touch, small screens and non-Chromium engines use the conservative path',()=>{
  for(const args of [{coarse:true},{width:390},{userAgent:'Mozilla/5.0 Version/18.0 Safari/605.1.15'},{userAgent:'Mozilla/5.0 Firefox/130.0'},{animations:false}])assert.equal(profile(args).stable,true);
  assert.equal(profile({userAgent:'Mozilla/5.0 Chrome/130.0',width:1280}).stable,false);
});

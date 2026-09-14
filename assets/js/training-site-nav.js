(function(){
  'use strict';
  function render(){
    const host=document.getElementById('trainingSiteHeader');
    if(!host) return;
    host.className='training-site-header';
    host.innerHTML=`
      <div class="training-shell training-header-inner">
        <a class="training-brand" href="index.html" aria-label="screenings4u Learning Center home">
          <img src="images/logo.png" alt="screenings4u">
          <span>Learning Center</span>
        </a>
        <nav class="training-header-nav" aria-label="Learning Center navigation">
          <a href="index.html#curriculum">Curriculum</a>
          <a href="index.html#included">What's Included</a>
          <a href="index.html#pricing">Pricing</a>
          <a href="group-training.html">Group Training</a>
          <a href="collector-training-supplies.html">Training Supplies</a>
          <a href="index.html#faq">FAQ</a>
        </nav>
        <div class="training-header-actions">
          <a class="training-login-link" href="training-login.html">Student Login</a>
          <a class="training-button training-button-primary" href="index.html#pricing">Enroll Now</a>
        </div>
      </div>`;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render); else render();
})();

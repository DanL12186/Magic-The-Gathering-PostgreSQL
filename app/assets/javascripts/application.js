// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, or any plugin's
// vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file. JavaScript code in this file should be added after the last require_* statement.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require rails-ujs
//= require jquery
//= require activestorage
//= require bootstrap-sprockets
//= require turbolinks
//= require_tree .

  $(document).on("turbolinks:load", function() {
    $(".edition_rare, .edition_uncommon").on('mouseenter', function() {
        const edition = this.parentElement.getAttribute('data-edition')
        ,     rarity  = this.parentElement.getAttribute('data-rarity');
        this.src = `/assets/editions/${edition} ${rarity}.png`;
        
    }).on('mouseleave', function() {
        const edition = this.parentElement.getAttribute('data-edition');
        this.src = `/assets/editions/${edition}.png`;
    });
  })

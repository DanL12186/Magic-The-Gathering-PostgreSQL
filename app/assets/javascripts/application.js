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
    const edition = this.parentElement.getAttribute('data-edition').replace('_', ' ')
    ,     rarity  = this.parentElement.getAttribute('data-rarity');

    this.src = `/assets/editions/${edition} ${rarity}.png`;
  }).on('mouseleave', function() {
    const edition = this.parentElement.getAttribute('data-edition').replace('_', ' ');
    this.src = `/assets/editions/${edition}.png`;
  });

//adds additional rows to table on hand_odds_calculator page
  $('#add-card-inputs').on('click', function appendFields() {
    const fieldCount = parseInt( $('#add-card-inputs').val() ) + 1
    
    $('#add-card-inputs').val(fieldCount)

    $('table#odds-input-table').append(
      `<tr>
        <td> <input type=number name=in_deck_${fieldCount} id=in_deck_${fieldCount} class=input-sm> </input> </td>
        <td> <input type=number name=in_hand_${fieldCount} id=in_hand_${fieldCount} class=input-sm> </input> </td>
        <td> <input type=text name=card_name_${fieldCount} id=card_name_${fieldCount} class=input-sm> </input> </td>
      </tr>`
    )
  });

  //handles hand_odds_calculator submit form and appends result
  $('form.calculate-odds').on('submit', function(event) {
    event.preventDefault();

    const serializedForm = $(this).serialize()
    ,     response = $.post(`/decks/calculate_custom_hands_odds`, serializedForm);

    response.done(function(resultAsFloat) {
      $('#odds-results').html(resultAsFloat + "%");
    });
  });

  //clear input formx
  $('button.clear-form').on('click', function(event) {
    $('form.calculate-odds').trigger('reset')
    //stops "please fill in this form" from triggering
    event.preventDefault()
  });
})
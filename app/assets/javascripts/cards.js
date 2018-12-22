$(document).on('turbolinks:load', function() {
  
  const numberWithDelimiter = (strNum, delimeter = ',') => {
    if (strNum === "N/A") return "N/A"
    const decimalLength = strNum.includes('.') ? strNum.match(/\.\d+/)[0].length : 0
    ,     strNumArr = strNum.replace(/[^\d\.]/g, '').split('');
    
    let offset = decimalLength + 4;

    for (let i = strNumArr.length - offset; i >= 0; i -= 3) {
      strNumArr[i] += delimeter
    }
    return "$" + strNumArr.join('')
  }

  //switch to high-res Scryfall image (672x936) from original low-res image (223x310) 
  $(".card_show").on('click', function() {
    const originalSrc = this.getAttribute('original_src')
    ,     hiResImgUrl = this.getAttribute('img_url')

    if (this.src.includes('scryfall')) {
      this.src = originalSrc;
      this.style.width = "226px";
      this.style.height = "311px";
      
      //ignore unless card has a hi-res image version
    } else if (hiResImgUrl) { 
      this.src = hiResImgUrl; //.replace("large", "normal") for smaller image (488x680 @ ~55-60% file size)
      this.style.width = "502px";
      this.style.height = "700px";
    }
  });

  //updates DOM on card show page with new prices if older than 24hrs or prices don't exist.
  if (document.getElementById('card-kingdom')) {
    const stale = $(".price").data('stale')
    ,     id = $('.price')[0].id;

    if (stale) {
      const response = $.post(`/cards/update_prices?id=${id}`)
      
      response.done(card=> {
        //card.price is an array of mtgoldfish, card kingdom, and tcg player prices. Updates DOM if price has changed.
        for (let i = 0; i < 3; i++) {
          if ($("h4 span")[i].innerText !== card.price[i]) {
            const spanID = $("h4")[i+1].id,
                  price  = card.price[i],
                  selector = `h4#${spanID} span`;

            $(selector).fadeOut(750).fadeIn(750)

            setTimeout(() => {
              $("h4 span")[i].innerText = numberWithDelimiter(price);
            }, 750)
          };
        }
      })
    }
  }

  //popover for card search results page
  $(function () {
    $('[data-toggle="popover"]').popover({
      html: true,
      boundary: 'scrollParent',
      trigger: 'hover',
      delay: { "show": 200, "hide": 150 },
      content: function() { 
        return `<img src="${this.getAttribute('data-url')}" >`
      }
    })
  })

  //popover remains after hitting back button without this
  $("li.card").on('click', function() {
    this.children[1].remove()
  });


  //populate /cards/find_by_properties with found cards
  //need to fix the fact that buttons don't disappear after hitting a sort button first, and showing basic lands
  $("form.find_by_properties").on('submit', function(event) {
    event.stopPropagation();
    event.preventDefault();
    
    function generateCardsHTML(cards) {
      return cards.map(card=> {
        const cardClass = card.edition === 'Alpha' ? 'card_img alpha' : 'card_img'
        ,     thumbnail = (card.hi_res_img || card.img_url).replace(/large/,'small')
        ,     edition   = card.edition.toLowerCase()
        ,     rarity    = card.rarity.toLowerCase();

        return( 
          `<div class = 'col-sm-3'>
            <h3 data-edition= ${edition.replace(/ /g,'_')} data-rarity=${rarity} style="font-family:MagicMedieval;"> 
              ${card.name} <img src="/assets/editions/${edition}" class= edition_${rarity} width=5% >
            </h3>
            
            <div class=card_img_div> <a href="/cards/${card.id}/"> <img src="${thumbnail}" class="${cardClass}" style="width: 146px; height: 204px;"> </a> </div>
            
          </div>`
        )
      }).join('')
    };

    const serializedForm = $(this).serialize()
    ,     response = $.post(`/cards/filter_search`, serializedForm);

    response.done(cards => {

      if (cards === null) {
        document.getElementById("find_cards").innerHTML = 'Please Select One or More Options'
        return;
      }

      const html = generateCardsHTML(cards);
      document.getElementById("find_cards").innerHTML = html || "No results found"
      
      //create buttons to sort newly displayed card results
      if (html) {  
        document.getElementById("sort_by_name").innerHTML = `<button>Sort By Name</button>`
        document.getElementById("sort_by_id").innerHTML = `<button>Sort By Multiverse ID</button>`
        document.getElementById("sort_by_price").innerHTML = `<button>Sort By Price</button>`
        document.getElementById("sort_by_color").innerHTML = `<button>Sort By Color</button>`
      }

      $("#sort_by_name").on('click', function(event) {
        event.preventDefault();

        const sortedCards = generateCardsHTML(cards.sort((a,b) => a.name.localeCompare(b.name)))
        document.getElementById("find_cards").innerHTML = sortedCards;
      });

      $("#sort_by_id").on('click', function(event) {
        event.preventDefault();
        
        const sortedCards = generateCardsHTML(cards.sort((a,b) => a.multiverse_id - b.multiverse_id))
        document.getElementById("find_cards").innerHTML = sortedCards;
      });

      //this sorts only by the prices on CardKingdom, as other prices are only suggestions
      $("#sort_by_price").on('click', function(event) {
        event.preventDefault();

        const sortedCards = generateCardsHTML(cards.sort((a,b) => {
          const [priceA, priceB] = [a, b].map(card=> parseFloat(card.price[1].match(/\d+\,*\d*\.*\d*/)))
          return priceB - priceA;
        }));

        document.getElementById("find_cards").innerHTML = sortedCards;
      });

      $("#sort_by_color").on('click', function(event) {
        
        const colorWeights = {
          'White' : 1,
          'Blue'  : 2,
          'Black' : 3,
          'Red'   : 4,
          'Green' : 5,
          'Colorless' : 6,
          'Gold'  : 7
        }

        event.preventDefault();
        
        const sortedCards = generateCardsHTML(cards.sort((a,b)=> colorWeights[a.color] - colorWeights[b.color]))
        document.getElementById("find_cards").innerHTML = sortedCards;
      });

      //clear "sort by" buttons when a card is clicked. not working if sort buttons hit
      $(".card_img").on('click', function() {
        $("a.btn-sm").empty()
      })

    });
  });
});
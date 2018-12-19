$(document).on('turbolinks:load', function() {
  
  const numberWithDelimiter = (strNum, delimeter = ',') => {
    const decimalLength = strNum.includes('.') ? strNum.match(/\.\d+/)[0].length : 0
    ,     strNumArr = strNum.replace('$','').split('');
    
    let offset = decimalLength + 4;

    for (let i = strNumArr.length - offset; i >= 0; i -= 3) {
      strNumArr[i] += delimeter
    }
    return strNumArr.join('')
  }

  //switch to high-res Scryfall image (672x936) from original low-res image (223x310) 
  $(".card_show").on('click', function() {
    const originalSrc = this.getAttribute('original_src')
    ,     hiResImgUrl = this.getAttribute('img_url')

    if (this.src.includes('scryfall')) {
      this.src = originalSrc;
      this.style.width = "223px";
      this.style.height = "310px";
      
      //ignore unless card has a hi-res image version
    } else if (hiResImgUrl) { 
      this.src = hiResImgUrl; //.replace("large", "normal") for smaller image (488x680 @ ~55-60% file size)
      this.style.width = "502px";
      this.style.height = "700px";
    }
  });

  //later save prices with commas to begin with
  if (document.getElementById('card-kingdom')) {
    const stale = $('div.price')[0].getAttribute('data-stale')
    ,     id = +$('div.price')[0].id;

    if (stale === 'true') {
      const response = $.post(`/cards/update_prices?id=${id}`)
      
      response.done(card=> {
        const [mtgPrice, ck, tcg] = card.price
        ,     edition = card.edition 
        let   cardKingdomEdition = (edition == 'Revised') ? ('3rd-edition') : (edition == 'Fourth Edition') ? '4th-edition' : edition.replace(' ', '-').toLowerCase().replace("'", '')
        ,     tcgEdition;

        if (/Alpha|Beta|Unl|Rev/.test(edition)) { 
          tcgEdition = edition + '-edition'  
        }

        if (cardKingdomEdition.match(/\d{4}/)) {
          cardKingdomEdition = `${edition.match(/\d+/)[0]}-core-set`
        }

        mtgEdition = (/Alpha|Beta/.test(edition) ? (`Limited Edition ${edition}`) : /Rev|Unl/.test(edition) ? (`${edition} Edition`) : (edition))

        //String.prototype.normalize('NFD') converts an accented character to unicode + accents (e.g. 'é' => 'e' + '´'), then take the first one
        //alternatively: transliterate = str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        const transliterate = str => str.split('').map(ch=> ch.normalize('NFD')[0]).join('').replace(/[',\.\:\;]/g,'')

        mtgURL= `<a target="_blank" rel="noopener noreferrer" href="https://www.mtggoldfish.com/price/${mtgEdition.replace(/ /g,'+')}/${transliterate(card.name).replace(/ /g, ('+'))}#paper">MTGoldfish Price:</a>`

        $("h4#mtg-fish")[0].innerHTML = `${mtgURL} ${mtgPrice}`

        $("h4#card-kingdom")[0].innerHTML = `<a target="_blank" rel="noopener noreferrer" href="https://www.cardkingdom.com/mtg/${edition.replace(/ /g, '-').toLowerCase()}/${transliterate(card.name).replace(/ /g, '-').toLowerCase()}">Card Kingdom Price: </a> $${numberWithDelimiter(ck)}`
        
        $("h4#tcg-player")[0].innerHTML = `<a target="_blank" rel="noopener noreferrer" href="https://shop.tcgplayer.com/magic/${(tcgEdition||edition).replace(/ /g, '-').toLowerCase()}/${transliterate(card.name).replace(/ /g, '-').toLowerCase()}">TCG Player Median Price: </a> ${tcg}`
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

        return( 
          `<div class = 'col-sm-3'>
            <h3 data-edition= ${card.edition.toLowerCase().replace(/ /g,'_')} data-rarity=${card.rarity.toLowerCase()}> 
              ${card.name} <img src="/assets/editions/${card.edition.toLowerCase()}" class= edition_${card.rarity.toLowerCase()} width=5% >
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
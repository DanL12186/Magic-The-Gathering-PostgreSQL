module CardHelper
  include Cards
  require 'open-uri'
  
  def card_and_edition(name, edition)
    edition.match?(/Alpha|Beta|Unlimited|Revised/) ? "#{edition} #{name}" : "#{name} (#{edition})"
  end

  def edition_filename(rarity, edition)
    file = rarity == "Common" ? "editions/#{edition.downcase}" : "editions/#{edition.downcase} #{rarity.downcase}"
    file.delete(':')
  end

  def is_modern_or_basic_land?(card)
    !Editions[card.edition] || card.card_type == "Basic" && !card.subtypes.include?("Nonbasic Land")
  end

  def mana_color(color)
    color.match?(/\d+|X/) ? 'Colorless' : color
  end

  def insert_commas_in_price(price)
    return 'Fetching...' if price.nil?
    return 'N/A' if price == 'N/A'

    "$#{number_with_delimiter(price)}"
  end

  def rotation_type(year) 
    year.to_i < 2017 ? 'cw' : 'ccw'
  end

  def needs_updating?(last_updated, price)
    older_than_24_hours?(last_updated) || price.empty?
  end

  def older_than_24_hours?(last_updated)
    (Time.now - last_updated) > 24.hours
  end

  def lazy_load?(idx, edition = nil)
    idx > 1 && edition != 'Antiquities'
  end

  def wizards_reserved_list
    "https://magic.wizards.com/en/articles/archive/official-reprint-policy-2010-03-10"
  end

  def add_prices_to_all
    cards = Card.where(price: [])
    cards.each do | card | 
      args = [card.name, card.edition]
      prices = [get_mtgoldfish_price(*args), get_card_kingdom_price(*args), get_tcg_player_price(*args) ]
      card.update(price: prices)
    end
  end

  ##################################### Links and Scraping #####################################

  def scrape_page_if_exists(url)
    Thread.new do 
      begin
        Nokogiri::HTML(open(url))
      rescue OpenURI::HTTPError => error
        raise error unless error.message.match?("Not Found")
      end
    end.value
  end


  def mtgoldfish_url(card_name, card_set)
    set = (card_set.match?(/Alpha|Beta/) ? ("Limited Edition #{card_set}") : card_set.match?(/^Rev|Unl/) ? ("#{card_set} Edition") : (card_set))
          .gsub(' ', '+').delete("':")
    name = I18n.transliterate(card_name).delete(",.:;\"'/!()").gsub(/ +/, '+')

    "https://www.mtggoldfish.com/price/#{set}/#{name}#paper"
  end

  def get_mtgoldfish_price(card_name, card_set)
    url = mtgoldfish_url(card_name, card_set)
    page = scrape_page_if_exists(url)
    price = page ? page.css('.price-box-price').children.last.try(:text) : nil
    price ? price.delete(',') : 'N/A'
  end


  def card_kingdom_url(card_name, card_set)
    set = (card_set == 'Revised') ? ('3rd-edition') : (card_set == 'Fourth Edition') ? '4th-edition' : card_set.gsub(' ', '-').downcase.delete("':")
    set = set.match(/201[0-5]/) ? "#{set.match(/\d+/)[0]}-core-set" : set
    set = "Ravnica" if card_set.match?("Ravnica: City of Guilds")
    name = I18n.transliterate(card_name.downcase).delete(",.:;'\"/!").gsub(/ +/,'-')

    "https://www.cardkingdom.com/mtg/#{set}/#{name}"
  end

  def get_card_kingdom_price(card_name, card_set)
    url = card_kingdom_url(card_name, card_set)
    page = scrape_page_if_exists(url)
    price = page.css('span.stylePrice').first.text.strip if page
    
    price ? price.delete('$') : 'N/A'
  end


  def tcg_player_url(card_name, card_set)
    set = card_set.gsub(' ', '-').downcase.delete(':')
    set += card_set.match(/201[0-5]/) ? "-m#{set.match(/\d{2}$/)[0]}" : card_set.match?(/Alpha|Beta|Unl|^Rev/) ? '-edition' : ''
    name = I18n.transliterate(card_name.downcase).delete(",.:;\"'/").gsub(/ +/, '-')

    "https://shop.tcgplayer.com/magic/#{set}/#{name}"
  end

  def get_tcg_player_price(card_name, card_set)
    url = tcg_player_url(card_name, card_set)
    page = scrape_page_if_exists(url)
    price = page ? page.css('div.price-point.price-point--market td').first.text : nil

    price ? price.delete('$,') : 'N/A'
  end


  def gatherer_link(multiverse_id)
    "http://gatherer.wizards.com/Pages/Card/Details.aspx?printed=true&multiverseid=#{multiverse_id}"
  end

  def ebay_search_link(card_name, card_set)
    set = card_set.downcase.gsub(' ', '+')
    name = card_name.downcase.gsub(' ', '+')
    "https://www.ebay.com/sch/i.html?&_nkw=#{set}+#{name}"
  end
  #######################################################################################################
end
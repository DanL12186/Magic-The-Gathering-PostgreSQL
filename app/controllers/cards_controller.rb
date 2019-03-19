require 'set_price_scraper.rb'

class CardsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:update_prices]
  before_action :get_filter_search_results, only: [:filter_search]

  include Cards
  include CardHelper
  include Pagy::Backend

  def show
    @card = Card.find_by(edition: params[:edition], name: params[:name])
    if @card.layout == 'transform'
      @flip = Card.find_by(multiverse_id: @card.flip_card_multiverse_id)
    end
  end

  #grabbing all unique names; calling .to_s as it's faster than .to_json
  def card_names
    names = Card.where(reprint: false).pluck(:name)
    render json: names.to_s
  end

  #only called if card hasn't been updated in > 24h
  def update_prices
    card = Card.find(params[:id])
    flip = Card.find_by(multiverse_id: card.flip_card_multiverse_id) if card.flip_card_multiverse_id
    name = card.name
    set  = card.edition
    
    #updated_at prevents repeated views from triggering updates after a necessary update was performed but no prices changed
    #check needs_updating? again so backclicks don't cause a retrigger
    if needs_updating?(card.updated_at, card.prices)
      prices = [ get_mtgoldfish_price(name, set),  get_card_kingdom_price(name, set),  get_tcg_player_price(name, set) ]
      card.update(prices: prices, updated_at: Time.now)

      #ensure later that only the front of a card can be directly accessed; for now this will do.
      flip.update(prices: prices, updated_at: Time.now) if flip
    end

    #SetScraper.get_set_prices(AllEditionsStandardCodes[card.edition])

    render json: card.to_json
  end

  def search_results
    search_result = Card.search(params[:search])
    if search_result.is_a?(Hash)
      redirect_to card_path(search_result[:edition], search_result[:name])
    else
      @matches, @partial_matches = search_result
    end
  end

  def color
    @pagy, @cards = pagy(Card.where(color: params[:color], reprint: false).order(:name), items: 100)
  end

  def edition
    @pagy, @cards = pagy(Card.where(edition: params[:edition]).order(:multiverse_id), items: 100)
  end

  #only display original prints, ignoring reprints of that artist's work
  def artist
    @cards = Card.where(artist: params[:artist]).order(:multiverse_id, :color).uniq(&:name)
  end

  def reserved_list
    @pagy, @cards = pagy(Card.where(reserved: true, reprint: false).order(:multiverse_id), items: 50)
  end

  def filter_search
    render json: CardSerializer.new(@results).serializable_hash[:data]
  end

  private

  def get_filter_search_results
    #required_attributes are required for the page to display and for sort buttons to work; filter_options are the user's selection of filters.
    required_attributes = [:rarity, :edition, :converted_mana_cost, :prices, :card_type, :color, :name, :hi_res_img, :multiverse_id]
    filter_options = Card.attribute_names
    
    filters = params.select { | key, value | filter_options.include?(key) && !value.empty? }.permit!
    filters.delete(:reprint) if filters[:edition]

    min_filters = filters[:edition] ? 1 : 2

    @results = Card.select(filters.keys + required_attributes).where(filters).first(1200) unless filters.keys.size < min_filters
  end

end
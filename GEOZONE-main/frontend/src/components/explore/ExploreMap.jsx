import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import '../../styles/leaflet.css';
import { formatVND } from '../../data/mockData';

const toCoordinate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasCoordinates = (place) => (
  !!place
  && toCoordinate(place.latitude) !== null
  && toCoordinate(place.longitude) !== null
);

const getLatLng = (place) => [toCoordinate(place.latitude), toCoordinate(place.longitude)];

const getCityCenter = (cityConfig) => (
  cityConfig?.center
  || (cityConfig?.key === 'danang' ? [16.0544, 108.2022] : [16.4637, 107.5909])
);

function readColors() {
  const rootStyles = getComputedStyle(document.documentElement);
  const accent = rootStyles.getPropertyValue('--gz-color-primary').trim() || '#0b6e8e';
  const selected = rootStyles.getPropertyValue('--gz-color-primary-pressed').trim() || accent;
  return { accent, selected };
}

function buildIcon(isSelected, inCart) {
  const { accent, selected } = readColors();
  const size = isSelected ? 34 : 28;
  const color = isSelected ? selected : accent;
  const ring = isSelected ? '0 0 0 4px rgba(11,110,142,.28), ' : '';

  return L.divIcon({
    className: 'gz-pin-icon',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50% 50% 50% 0;
        background:${color};
        transform:rotate(-45deg);
        border:2px solid #ffffff;
        box-shadow:${ring}0 2px 6px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;
      ">
        <span style="transform:rotate(45deg);color:#ffffff;font-size:${isSelected ? 13 : 11}px;font-weight:700;">
          ${inCart ? '✓' : '★'}
        </span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
}

function buildPopup(place, inCart, readOnly, onToggle) {
  const { accent } = readColors();
  const root = document.createElement('div');
  root.style.fontFamily = getComputedStyle(document.body).fontFamily;
  root.style.padding = '4px';

  const name = document.createElement('strong');
  name.style.cssText = 'font-size:14px;color:#0f172a;display:block;margin-bottom:4px;';
  name.textContent = place.name || '';
  root.appendChild(name);

  const zone = document.createElement('div');
  zone.style.cssText = 'font-size:12px;color:#64748b;margin-bottom:4px;';
  zone.textContent = place.zoneName || '';
  root.appendChild(zone);

  const cost = document.createElement('div');
  cost.style.cssText = `font-size:12px;font-weight:600;color:${accent};margin-bottom:${readOnly ? '0' : '8px'};`;
  cost.textContent = formatVND(place.estimatedCost ?? place.cost ?? 0);
  root.appendChild(cost);

  if (!readOnly) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = `background:${accent};color:#fff;border:0;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;width:100%;`;
    button.textContent = inCart ? 'Bỏ chọn khỏi lịch trình' : '+ Thêm vào lịch trình';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onToggle(place);
    });
    root.appendChild(button);
  }

  return root;
}

export default function ExploreMap({
  cityConfig,
  places = [],
  selectedPlace = null,
  onSelectPlace = () => {},
  onToggleCart = () => {},
  cartItems = [],
  readOnly = false,
  isVisible = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersRef = useRef(new Map()); // id -> { marker, place }
  const fitRef = useRef(() => {});

  // Luôn giữ giá trị mới nhất để marker không phải dựng lại mỗi lần App render
  const latest = useRef({});
  latest.current = { selectedPlace, onSelectPlace, onToggleCart, cartItems, readOnly };

  const isInCart = (id) => latest.current.cartItems.some((item) => item.id === id);
  const isSelectedId = (id) => latest.current.selectedPlace?.id === id;

  // Cách căn khung nhìn theo danh sách địa điểm đang hiển thị
  fitRef.current = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const size = map.getSize();
    if (!size.x || !size.y) return; // container đang ẩn, đợi ResizeObserver gọi lại

    const coordinates = places.filter(hasCoordinates).map(getLatLng);
    if (coordinates.length > 1) {
      map.fitBounds(L.latLngBounds(coordinates), { padding: [28, 28], maxZoom: 14, animate: false });
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 14, { animate: false });
    } else {
      map.setView(getCityCenter(cityConfig), 12, { animate: false });
    }
  };

  // 1. Khởi tạo bản đồ (một lần)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return undefined;

    const map = L.map(container, {
      center: getCityCenter(cityConfig),
      zoom: 12,
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Nhãn chủ quyền Hoàng Sa / Trường Sa
    L.marker([16.5333, 111.6833], {
      icon: L.divIcon({
        className: 'sea-lbl',
        html: 'Quần đảo Hoàng Sa<small>(Đà Nẵng, Việt Nam)</small>',
        iconSize: [160, 36],
        iconAnchor: [80, 18]
      }),
      interactive: false,
      keyboard: false
    }).addTo(map);

    L.marker([10.15, 114.35], {
      icon: L.divIcon({
        className: 'sea-lbl',
        html: 'Quần đảo Trường Sa<small>(Khánh Hòa, Việt Nam)</small>',
        iconSize: [160, 36],
        iconAnchor: [80, 18]
      }),
      interactive: false,
      keyboard: false
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Bản đồ có thể được dựng khi container đang ẩn (chế độ Lập lịch) hoặc kích thước thay đổi
    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (mapInstanceRef.current !== map) return;
        const previous = map.getSize();
        const hadSize = previous.x > 0 && previous.y > 0;
        map.invalidateSize({ animate: false });
        if (!hadSize) fitRef.current(); // chỉ căn lại khi bản đồ vừa hiện ra từ trạng thái ẩn
      });
      observer.observe(container);
    }

    // Chạy một lần sau khi layout ổn định
    const settle = setTimeout(() => {
      if (mapInstanceRef.current !== map) return;
      map.invalidateSize({ animate: false });
      fitRef.current();
    }, 0);

    return () => {
      clearTimeout(settle);
      if (observer) observer.disconnect();
      map.stop();
      map.remove();
      if (mapInstanceRef.current === map) {
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        markersRef.current = new Map();
      }
    };
  }, []);

  // 2. Dựng lại marker khi danh sách địa điểm thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current = new Map();

    places.forEach((place) => {
      if (!hasCoordinates(place)) return;

      const selected = isSelectedId(place.id);
      const marker = L.marker(getLatLng(place), {
        icon: buildIcon(selected, isInCart(place.id)),
        zIndexOffset: selected ? 1000 : 0,
        keyboard: true,
        title: place.name || ''
      });

      marker.bindPopup(
        buildPopup(place, isInCart(place.id), latest.current.readOnly, (p) => latest.current.onToggleCart(p)),
        { autoPan: false }
      );
      marker.on('click', () => latest.current.onSelectPlace(place));

      layer.addLayer(marker);
      markersRef.current.set(String(place.id), { marker, place });
    });
  }, [places, readOnly]);

  // 3. Cập nhật biểu tượng/popup khi giỏ lịch trình đổi (không đóng popup đang mở)
  useEffect(() => {
    markersRef.current.forEach(({ marker, place }) => {
      const inCart = isInCart(place.id);
      marker.setIcon(buildIcon(isSelectedId(place.id), inCart));
      marker.setPopupContent(
        buildPopup(place, inCart, latest.current.readOnly, (p) => latest.current.onToggleCart(p))
      );
    });
  }, [cartItems]);

  // 4. Căn khung nhìn theo các địa điểm đang hiển thị
  useEffect(() => {
    fitRef.current();
  }, [places, cityConfig]);

  // 5. Khi chọn địa điểm (từ thẻ hoặc từ marker): làm nổi marker, trượt bản đồ tới đó, mở popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker, place }) => {
      const selected = selectedPlace ? place.id === selectedPlace.id : false;
      marker.setIcon(buildIcon(selected, isInCart(place.id)));
      marker.setZIndexOffset(selected ? 1000 : 0);
    });

    if (!selectedPlace) {
      map.closePopup();
      return;
    }

    const entry = markersRef.current.get(String(selectedPlace.id));
    if (!entry) return;

    const target = entry.marker.getLatLng();
    map.invalidateSize({ animate: false });
    map.setView(target, Math.max(map.getZoom(), 14), { animate: true });
    entry.marker.openPopup();
  }, [selectedPlace]);

  // 6. Khi chuyển lại sang chế độ Khám phá, tính lại kích thước bản đồ
  useEffect(() => {
    if (!isVisible || !mapInstanceRef.current) return undefined;
    const timer = setTimeout(() => {
      const map = mapInstanceRef.current;
      if (!map) return;
      map.invalidateSize({ animate: false });
      fitRef.current();
    }, 0);
    return () => clearTimeout(timer);
  }, [isVisible]);

  return (
    <section className="mapwrap" aria-label="Bản đồ tương tác">
      <div
        id="map"
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', minHeight: '380px' }}
      />
    </section>
  );
}

# Изображения и шрифты

## Фотография

`public/assets/profile-source.jpg` — фотография из публичного профиля `https://t.me/evgeinif`, визуально совпадающая с фотографией, предоставленной Александром. Сохранена локально без генеративной обработки лица.

## Превью работ

`public/assets/works/<слаг>.jpg` — снимки главных экранов сайтов, которые я спроектировал и собрал: «Тунец», Lotus Vie, «Империя», «Рыжая кошка» и «Лавли». `public/assets/works/<слаг>-full.jpg` — те же сайты целиком, для просмотра по клику.
`public/assets/compare/*.jpg` — они же в пропорции 16:9 для слайдера сравнения.

Все сняты headless-браузером с локальных копий проектов при ширине 1440 px и сохранены в JPEG. Перед съёмкой страницы целиком блоки, которые появляются по скроллу, принудительно показываются — иначе в снимок попадают пустые полосы.

## Изображение первого экрана

`public/assets/architecture.webp` — создано встроенным инструментом imagegen, используется в макете-примере на главной.

```text
Use case: photorealistic-natural. Wide cinematic editorial architecture photograph, 1536x1024 landscape. A low modern minimalist house with warm honey limestone and dark oak exterior, expansive glass doors with softly lit interior, surrounded by silver-green tall grasses and a single sculptural olive tree. Late afternoon warm Mediterranean sun casting long delicate shadows, rolling hills behind, tasteful terracotta earthy tones and film grain. No text, no logos, no watermark, no people.
```

## Обложка для соцсетей

`public/assets/og-cover.png` — 1200×630, собрана из вёрстки проекта (шрифт Manrope, фирменные цвета) и снята headless-браузером. Генеративных изображений и фотографий в ней нет.

## Шрифт

Manrope, локальные файлы начертаний 400–800 из Google Fonts. Лицензия SIL Open Font License находится рядом с файлами шрифта в `public/assets/Manrope-OFL.txt`.

## Kakao 지도 Web API 가이드

**[준비하기](#ready)**

**[시작하기](#start)**

**[지도 URL](#mapurl)**
- [지도 바로가기](#bigmapurl)
- [길찾기 바로가기](#routeurl)
- [로드뷰 바로가기](#roadviewurl)
- [지도 검색결과 바로가기](#searchurl)

**[더 살펴보기](#more)**

## 준비하기

**Kakao 지도 Javascript API** 키 발급 필수. 카카오 계정 필요.

키 발급 과정.

1. *[카카오 개발자사이트](https://developers.kakao.com/)* (https://developers.kakao.com) 접속  
2. 개발자 등록 및 앱 생성  
3. \[앱\] > \[앱 설정\] > \[앱\] > \[플랫폼 키\] 에서 이용할 JavaScript Key를 선택 합니다.  
4. 해당 키에서 JavaScript SDK 도메인을 등록합니다. (예: https://example.com)  
5. 페이지 상단에서 JavaScript 키를 확인하고 복사하여, 지도 API의 appkey로 사용합니다.  
6. 앱을 실행합니다.

- 등록 도메인(예: http://localhost:8080) 웹 서버 실행 파일 로드.
```shell
# Python이 설치된 컴퓨터에서는 해당 폴더로 이동 후
$ cd /path/to/your/folder/

# 다음과 같이 테스트용 웹 서버를 실행할 수 있습니다.
$ python -m SimpleHTTPServer 8080
```
- 브라우저 도메인 접속.

등록 사이트 도메인 한정 지도 API 사용 가능. 필수 등록.

왼쪽 메뉴 열쇠 아이콘 클릭 시 *[내 애플리케이션](https://developers.kakao.com/console/app)* 이동. 키 미발급 시 해당 페이지 발급.

## 시작하기

간단 코드로 웹브라우저 지도 표시 가능. 단계별 진행.

### 지도를 담을 영역 만들기

지도 영역 필요. `500x400` 크기 생성.

```html
<div id="map" style="width:500px;height:400px;"></div>
```

지도 영역 `<div>` 태그 선언. `id="map"` 지정.

### 실제 지도를 그리는 Javascript API를 불러오기

```html
<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=발급받은 APP KEY를 넣으시면 됩니다."></script>
```

`//` 상대 프로토콜 사용 시 사용자 `http`/`https` 환경 맞춰 자동 연동.

API 로딩 스크립트 위치 무관. 실행 코드 이전 선언 필수.

### 지도를 띄우는 코드 작성

```js
var container = document.getElementById('map'); //지도 영역 DOM 레퍼런스
var options = { //지도 생성 기본 옵션
    center: new kakao.maps.LatLng(33.450701, 126.570667), //지도 중심좌표.
    level: 3 //지도 레벨(확대/축소)
};

var map = new kakao.maps.Map(container, options); //지도 생성, 객체 리턴
```

*[Map](https://apis.map.kakao.com/web/documentation/#Map)* 객체 두 번째 인자 `options` 속성 중 `center` 필수. `center` 값 *[LatLng](https://apis.map.kakao.com/web/documentation/#LatLng)* 클래스 생성. `WGS84` 좌표계 위도(latitude), 경도(longitude) 순 입력.

전체 코드는 아래와 같습니다.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Kakao 지도 시작하기</title>
</head>
<body>
    <div id="map" style="width:500px;height:400px;"></div>
    <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=발급받은 APP KEY를 넣으시면 됩니다."></script>
    <script>
        var container = document.getElementById('map');
        var options = {
            center: new kakao.maps.LatLng(33.450701, 126.570667),
            level: 3
        };

        var map = new kakao.maps.Map(container, options);
    </script>
</body>
</html>
```

브라우저 `500x400` 지도 생성 완료.

![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/215/741.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/215/742.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/215/743.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/216/741.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/216/742.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/216/743.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/217/741.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/217/742.png) ![](https://mts.daumcdn.net/api/v1/tile/PNGSD02/v20_9nuhw/latest/3/217/743.png)

50m

## 라이브러리 사용하기

### 지도 라이브러리란?

**Kakao 지도 Javascript API** 지도 연동 `라이브러리` 지원. 라이브러리는 특화 기능 모음. 추가 로드 사용. 제공 라이브러리 목록:

- `clusterer`: 마커 클러스터링 용 *[클러스터러](https://apis.map.kakao.com/web/documentation/#MarkerClusterer)* 라이브러리.
- `services`: *[장소 검색](https://apis.map.kakao.com/web/documentation/#services_Places)*, *[주소-좌표 변환](https://apis.map.kakao.com/web/documentation/#services_Geocoder)* 용 *[services](https://apis.map.kakao.com/web/documentation/#services)* 라이브러리.
- `drawing`: 마커 및 그래픽스 객체 제도 *[drawing](https://apis.map.kakao.com/web/documentation/#drawing)* 라이브러리.

라이브러리 지속 추가 예정.

### 라이브러리 불러오기

라이브러리 추가 로드 필요. 파라미터 추가 로드.

```html
<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=APIKEY&libraries=LIBRARY"></script>
```

`LIBRARY` 토큰 위치 라이브러리 명 입력 로드.

```html
<!-- services 라이브러리 불러오기 -->
<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=APIKEY&libraries=services"></script>
```
```html
<!-- services와 clusterer, drawing 라이브러리 불러오기 -->
<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=APIKEY&libraries=services,clusterer,drawing"></script>
```

## 지도 URL

특정 위치 표시 후 Kakao 지도 크게 보기, 길찾기 연결 시 아래 URL 사용. 사용자 환경 따라 PC/모바일웹 Kakao 지도 자동 연결.

### 지도 바로가기

좌표, 장소ID 이용 Kakao 지도 위치 표시 URL 생성 가능. 장소ID는 *[키워드로 장소 검색 API](https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword)* 또는 *[카테고리로 장소 검색 API](https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-category)* 반환값 확인.

| URL Pattern | 예시 |
| --- | --- |
| /link/`map`/ `위도`,`경도` | *[https://map.kakao.com/link/map/37.3952969470752,127.110449292622](https://map.kakao.com/link/map/37.3952969470752,127.110449292622)* |
| /link/`map`/ `이름`,`위도`,`경도` | *[https://map.kakao.com/link/map/카카오판교아지트,37.3952969470752,127.110449292622](https://map.kakao.com/link/map/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%8C%90%EA%B5%90%EC%95%84%EC%A7%80%ED%8A%B8,37.3952969470752,127.110449292622)* |
| /link/`map`/ `장소ID` | *[https://map.kakao.com/link/map/18577297](https://map.kakao.com/link/map/18577297)* |

### 길찾기 바로가기

좌표(이름, 위도, 경도) 또는 장소ID 이용 출발·경유·목적지 지정 길찾기 URL 생성 가능.  
※ 경유지 최대 5개. 대중교통(**'traffic'**)은 경유지 지정 불가.  
※ `{이동수단}`: 자동차(**'car'**), 대중교통(**'traffic'**), 도보(**'walk'**), 자전거(**'bicycle'**)  
※ 지하철노선도길찾기 `{지역명}`: **seoul**, **busan**, **daegu**, **gwangju**, **daejeon**

| URL Pattern | 예시 |
| --- | --- |
| /link/to/ `이름`,`위도`,`경도` | *[https://map.kakao.com/link/to/카카오판교아지트,37.3952969470752,127.110449292622](https://map.kakao.com/link/to/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%8C%90%EA%B5%90%EC%95%84%EC%A7%80%ED%8A%B8,37.3952969470752,127.110449292622)* |
| /link/to/ `장소ID` | *[https://map.kakao.com/link/to/18577297](https://map.kakao.com/link/to/18577297)* |
| /link/from/ `이름`,`위도`,`경도` /to/ `이름`,`위도`,`경도` | *[https://map.kakao.com/link/from/에이치스퀘어,37.402056,127.108212/to/카카오판교아지트,37.3952969470752,127.110449292622](https://map.kakao.com/link/from/%EC%97%90%EC%9D%B4%EC%B9%98%EC%8A%A4%ED%80%98%EC%96%B4,37.402056,127.108212/to/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%8C%90%EA%B5%90%EC%95%84%EC%A7%80%ED%8A%B8,37.3952969470752,127.110449292622)* |
| /link/by/ `{이동수단}` / `이름`,`위도`,`경도` / `이름`,`위도`,`경도` | *[https://map.kakao.com/link/by/car/에이치스퀘어,37.402056,127.108212/카카오판교아지트,37.3952969470752,127.110449292622](https://map.kakao.com/link/by/car/%EC%97%90%EC%9D%B4%EC%B9%98%EC%8A%A4%ED%80%98%EC%96%B4,37.402056,127.108212/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%8C%90%EA%B5%90%EC%95%84%EC%A7%80%ED%8A%B8,37.3952969470752,127.110449292622)* |
| /link/by/ `{이동수단}` / `이름`,`위도`,`경도` / `이름`,`위도`,`경도` / `이름`,`위도`,`경도` | *[https://map.kakao.com/link/by/walk/에이치스퀘어,37.402056,127.108212/알파돔타워,37.394245407468,127.110306812433/카카오판교아지트,37.3952969470752,127.110449292622](https://map.kakao.com/link/by/walk/%EC%97%90%EC%9D%B4%EC%B9%98%EC%8A%A4%ED%80%98%EC%96%B4,37.402056,127.108212/%EC%95%8C%ED%8C%8C%EB%8F%94%ED%83%80%EC%9B%8C,37.394245407468,127.110306812433/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%8C%90%EA%B5%90%EC%95%84%EC%A7%80%ED%8A%B8,37.3952969470752,127.110449292622)* |
| /link/by/subway/ `{지역명}` / `출발역명` / `도착역명` | *[https://map.kakao.com/link/by/subway/seoul/판교역/강남역](https://map.kakao.com/link/by/subway/seoul/%ED%8C%90%EA%B5%90%EC%97%AD/%EA%B0%95%EB%82%A8%EC%97%AD)* |

### 로드뷰 바로가기

좌표, 장소ID 이용 로드뷰 바로 실행 URL 생성 가능.

| URL Pattern | 예시 |
| --- | --- |
| /link/roadview/ `위도`,`경도` | *[https://map.kakao.com/link/roadview/37.3952969470752,127.110449292622](https://map.kakao.com/link/roadview/37.3952969470752,127.110449292622)* |
| /link/roadview/ `장소ID` | *[https://map.kakao.com/link/roadview/18577297](https://map.kakao.com/link/roadview/18577297)* |

### 지도 검색결과 바로가기

검색어 이용 검색결과 표시 URL 생성 가능.

| URL Pattern | 예시 |
| --- | --- |
| /link/search/ `검색어` | *[https://map.kakao.com/link/search/카카오](https://map.kakao.com/link/search/%EC%B9%B4%EC%B9%B4%EC%98%A4)* |

## 더 살펴보기

웹브라우저 지도 생성 가능. 지도 제어 가능. **Kakao 지도 Javascript API** 상세 정보 참고.

- API 응용 예제 *[Sample 페이지](https://apis.map.kakao.com/web/sample/)* 확인.
- API 상세 기능 *[Documentation 페이지](https://apis.map.kakao.com/web/documentation/)* 참고.
- 문의사항 *[개발자 포럼](https://devtalk.kakao.com/c/map-api)* 질문 가능. 타 개발자 도움 획득.